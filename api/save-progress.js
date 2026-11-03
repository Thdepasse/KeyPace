const { setCorsOrigin } = require('./_cors');
const { sanitizeProgress, MAX_BYTES } = require('./_progress-sanitize');
const { mergeProgress } = require('./_progress-merge');
const { archiveReasons, toEvict, alreadyKept, counts } = require('./_progress-history');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

async function sb(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {}),
    },
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, data: text ? JSON.parse(text) : null };
}

async function archivePrevious(userId, prevData, reasons) {
  if (!reasons.length) return;
  const kept = await sb(`/progress_history?user_id=eq.${userId}&select=id,lessons_count,tests_count,saved_at`);
  if (!kept.ok || !Array.isArray(kept.data)) return;
  if (alreadyKept(kept.data, prevData)) return;
  const c = counts(prevData);
  const ins = await sb('/progress_history', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, data: prevData, lessons_count: c.lessons, tests_count: c.tests, reason: reasons.join(' ').slice(0, 200) }),
  });
  if (!ins.ok) return;
  const rows = [...kept.data, { id: (ins.data && ins.data[0] && ins.data[0].id) || -1, lessons_count: c.lessons, tests_count: c.tests, saved_at: new Date().toISOString() }];
  const evict = toEvict(rows).filter((id) => id !== -1);
  if (evict.length) await sb(`/progress_history?id=in.(${evict.join(',')})&select=id`, { method: 'DELETE' });
  console.warn('save-progress historique', JSON.stringify({ user: userId, raisons: reasons }));
}

module.exports = async function handler(req, res) {
  setCorsOrigin(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { token } = req.body || {};
  let { data } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Token manquant.' });

  const r = await sb(`/users?session_token=eq.${encodeURIComponent(token)}&or=(session_expires_at.is.null,session_expires_at.gt.${new Date().toISOString()})&select=id`);
  const user = r.data && r.data[0];
  if (!user) return res.status(401).json({ error: 'Session invalide.' });

  // Pas de `data` => lecture : on renvoie la progression enregistrée (utilisé au chargement)
  if (data === undefined || data === null) {
    const pr = await sb(`/progress?user_id=eq.${user.id}&select=data`);
    const row = pr.data && pr.data[0];
    return res.json({ ok: true, id: user.id, data: (row && row.data) || {} });
  }

  if (typeof data !== 'object' || Array.isArray(data)) return res.status(400).json({ error: 'Données invalides.' });
  if (JSON.stringify(data).length > MAX_BYTES) return res.status(413).json({ error: 'Données trop volumineuses.' });

  // Mode de la fusion serveur (étape 1b, voir docs/PLAN-clavier-qwerty.md) :
  //   off     : comportement d'avant (le client remplace le bloc) ;
  //   observe : on calcule la fusion et on journalise ce qu'elle aurait évité, sans rien changer à l'écriture ;
  //   active  : on écrit la fusion, avec comparaison atomique sur `rev` (réessai, puis 409).
  const mode = ['off', 'observe', 'active'].includes(process.env.PROGRESS_MERGE_MODE) ? process.env.PROGRESS_MERGE_MODE : 'observe';
  const readRow = async () => {
    const pr = await sb(`/progress?user_id=eq.${user.id}&select=data,rev`);
    return (pr.data && pr.data[0]) || null;
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await readRow();
    const prevData = row && row.data;
    let next = { ...data };

    // Fusionne assignmentsDone plutôt que d'écraser : essaySubmit() (api/classes.js)
    // pose sa propre marque "devoir fait" directement en base, sans jamais
    // transiter par le client. Si l'élève enchaîne sur un autre exercice avant
    // de recharger la page, ce client (qui ignore encore cette marque) écrase
    // et efface tout le blob `data` en écrivant le sien : le devoir "essai"
    // redevient alors "non fait" malgré une copie bien rendue et notée.
    if (prevData && prevData.assignmentsDone) {
      next.assignmentsDone = { ...prevData.assignmentsDone, ...(next.assignmentsDone || {}) };
    }

    // Nettoyage : champs du serveur (role, classes, courses) conservés, valeurs impossibles
    // écartées champ par champ (la valeur enregistrée est gardée), clés inconnues signalées.
    const clean = sanitizeProgress(next, prevData);
    next = clean.data;
    if (attempt === 0 && (clean.dropped.length || clean.unknownKeys.length)) {
      console.warn('save-progress nettoyage', JSON.stringify({ user: user.id, ecartes: clean.dropped.length, champs: [...new Set(clean.dropped)], clesInconnues: clean.unknownKeys }));
    }

    // Fusion : ce que le client enverrait de moins que le serveur.
    let merged = null;
    if (prevData && mode !== 'off') {
      merged = mergeProgress(prevData, next);
      if (merged.changes.length && attempt === 0) {
        console.warn('save-progress fusion', JSON.stringify({ mode, user: user.id, champs: merged.changes }));
      }
    }
    const candidate = mode === 'active' && merged ? merged.data : next;

    // Garde-fou : une écriture ne doit jamais effacer des leçons déjà validées.
    // Ça arrive si le client sauvegarde avant d'avoir fini de charger la vraie
    // progression (bug côté client déjà corrigé, mais on protège aussi ici :
    // un ancien onglet resté ouvert, un cache non rafraîchi, etc. peuvent
    // encore envoyer un blob incomplet). On ne bloque qu'une VRAIE régression
    // du nombre de leçons ; l'ajout ou le maintien du même nombre passe toujours.
    if (prevData) {
      const prevLessons = Object.keys(prevData.lessons || {}).length;
      const nextLessons = Object.keys(candidate.lessons || {}).length;
      if (prevLessons > 0 && nextLessons < prevLessons) {
        return res.status(409).json({ error: 'Sauvegarde refusée : régression de progression détectée.' });
      }
    }

    // Historique : si cette écriture fait reculer des données, on garde la version actuelle.
    // Jamais bloquant : un échec ici (table absente, réseau) ne doit pas empêcher la sauvegarde.
    if (prevData) {
      try { await archivePrevious(user.id, prevData, archiveReasons(prevData, candidate)); }
      catch (e) { console.warn('save-progress historique ignoré', e && e.message); }
    }

    const body = { data: candidate, updated_at: new Date().toISOString() };
    if (mode === 'active' && row && typeof row.rev === 'number') {
      // Comparaison atomique : n'écrit que si personne n'a écrit depuis la lecture.
      const w = await sb(`/progress?user_id=eq.${user.id}&rev=eq.${row.rev}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...body, rev: row.rev + 1 }),
      });
      if (w.ok && Array.isArray(w.data) && w.data.length) return res.json({ ok: true });
      continue; // quelqu'un a écrit entre-temps : on relit et on refusionne
    }

    // Sinon => écriture en upsert (insère la ligne si elle n'existe pas encore)
    await sb(`/progress?on_conflict=user_id`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ user_id: user.id, ...body }),
    });
    return res.json({ ok: true });
  }
  console.warn('save-progress conflit persistant', JSON.stringify({ user: user.id }));
  return res.status(409).json({ error: 'Conflit de sauvegarde, réessaie.' });
};
