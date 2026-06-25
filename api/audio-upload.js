// Upload audio dictée prof → Supabase Storage bucket 'dictation-audio'
// Limite : MAX_AUDIO_PER_TEACHER devoirs actifs avec audio par prof.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
const BUCKET = 'dictation-audio';
const MAX_AUDIO_PER_TEACHER = 10;

async function sbRest(path, opts = {}) {
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
  let data = null;
  try { data = await r.json(); } catch {}
  return { ok: r.ok, data, status: r.status };
}

async function sbStorageUpload(fileName, buffer, mimeType) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': mimeType,
      'x-upsert': 'false',
    },
    body: buffer,
  });
  return r.ok;
}

async function sbStorageDelete(path) {
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'DELETE',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { token, audioBase64, mimeType = 'audio/webm', prevPath } = req.body || {};
  if (!token || !audioBase64) return res.status(400).json({ error: 'Paramètres manquants.' });

  // Auth : prof ou expert
  const uR = await sbRest(`/users?session_token=eq.${encodeURIComponent(token)}&select=id,plan,role`);
  const user = uR.data && uR.data[0];
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  if (user.role !== 'teacher' && user.plan !== 'expert') {
    return res.status(403).json({ error: 'Réservé aux comptes enseignant.' });
  }

  // Limite : compter les devoirs actifs avec audio_url pour ce prof
  const clsR = await sbRest(`/classes?teacher_id=eq.${encodeURIComponent(user.id)}&archived=eq.false&select=id`);
  const classIds = Array.isArray(clsR.data) ? clsR.data.map(c => c.id) : [];
  if (classIds.length) {
    const aR = await sbRest(`/assignments?class_id=in.(${classIds.join(',')})&audio_url=not.is.null&select=id`);
    const activeAudioCount = Array.isArray(aR.data) ? aR.data.length : 0;
    if (activeAudioCount >= MAX_AUDIO_PER_TEACHER) {
      return res.status(429).json({
        error: `Limite de ${MAX_AUDIO_PER_TEACHER} dictées audio atteinte. Supprime un devoir avec audio pour en créer un nouveau.`,
      });
    }
  }

  // Supprimer l'ancien fichier si c'est un réenregistrement
  if (prevPath) {
    const safe = prevPath.replace(/^.*dictation-audio\//, '');
    if (/^[0-9a-f-]+\/\d+\.webm$/.test(safe)) await sbStorageDelete(safe);
  }

  // Upload
  const audioBuffer = Buffer.from(audioBase64, 'base64');
  const fileName = `${user.id}/${Date.now()}.webm`;
  const ok = await sbStorageUpload(fileName, audioBuffer, mimeType);
  if (!ok) return res.status(500).json({ error: 'Erreur lors de l\'upload audio.' });

  const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
  const storagePath = fileName;
  return res.json({ audioUrl, storagePath });
};
