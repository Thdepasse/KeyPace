// Logique pure (sans I/O) pour les comptes établissement : permissions + agrégats.
// Testable avec `node --test`. Aucune dépendance.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Résumé des stats d'un élève à partir de son progress.data (jsonb) brut.
function studentSummary(data, now) {
  const d = data || {};
  const tests = Array.isArray(d.tests) ? d.tests : [];
  const lessons = d.lessons && typeof d.lessons === 'object' ? d.lessons : {};
  const lastTest = tests.length ? tests[tests.length - 1].t : null;
  const recent = tests.slice(-10);
  const avg = (key) =>
    recent.length ? Math.round(recent.reduce((a, t) => a + (t[key] || 0), 0) / recent.length) : null;
  const clearedLessons = Object.values(lessons).filter((l) => l && l.cleared).length;
  const daysSinceActive = lastTest != null ? Math.floor((now - lastTest) / (24 * 60 * 60 * 1000)) : null;
  return {
    sessions: tests.length,
    avgWpm: avg('wpm'),
    avgAcc: avg('acc'),
    clearedLessons,
    lastTest,
    daysSinceActive,
  };
}

// Agrège les stats d'une classe à partir d'une liste de progress.data élèves.
function aggregateClass(studentsData, now) {
  const sums = studentsData.map((d) => studentSummary(d, now));
  const total = sums.length;
  const activeThisWeek = sums.filter((s) => s.daysSinceActive != null && s.daysSinceActive < 7).length;
  const withWpm = sums.filter((s) => s.avgWpm != null);
  const withAcc = sums.filter((s) => s.avgAcc != null);
  const mean = (arr, key) => (arr.length ? Math.round(arr.reduce((a, s) => a + s[key], 0) / arr.length) : null);
  return {
    total,
    activeThisWeek,
    totalSessions: sums.reduce((a, s) => a + s.sessions, 0),
    avgWpm: mean(withWpm, 'avgWpm'),
    avgAcc: mean(withAcc, 'avgAcc'),
  };
}

// Alertes actionnables : élèves inactifs (>=7 j) et élèves "bloqués"
// (assez de sessions mais aucune leçon validée).
function detectAlerts(students, now, { stuckMinSessions = 5 } = {}) {
  const inactive = [];
  const stuck = [];
  for (const st of students) {
    const s = studentSummary(st.data, now);
    if (s.daysSinceActive != null && s.daysSinceActive >= 7) {
      inactive.push({ username: st.username, days: s.daysSinceActive });
    }
    if (s.sessions >= stuckMinSessions && s.clearedLessons === 0) {
      stuck.push({ username: st.username, sessions: s.sessions });
    }
  }
  return { inactive, stuck };
}

// Série d'activité jour par jour (par défaut 7 jours), du plus ancien au plus récent.
// Retourne [{sessions, avgWpm}] pour alimenter la courbe d'évolution du cockpit.
function dailySeries(studentsData, now, days = 7) {
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfToday = now - (now % dayMs);
  const buckets = Array.from({ length: days }, () => ({ sessions: 0, wpmSum: 0, wpmN: 0 }));
  for (const d of studentsData) {
    const tests = Array.isArray(d && d.tests) ? d.tests : [];
    for (const t of tests) {
      const dayStart = t.t - (t.t % dayMs);
      const idx = days - 1 - Math.round((startOfToday - dayStart) / dayMs);
      if (idx >= 0 && idx < days) {
        buckets[idx].sessions++;
        if (t.wpm != null) { buckets[idx].wpmSum += t.wpm; buckets[idx].wpmN++; }
      }
    }
  }
  return buckets.map((b) => ({ sessions: b.sessions, avgWpm: b.wpmN ? Math.round(b.wpmSum / b.wpmN) : null }));
}

// Permissions : qui peut piloter/voir une classe.
function canActAsTeacher(user) {
  return !!user && (user.role === 'prof' || user.role === 'admin');
}

function canManageClass(user, cls) {
  if (!user || !cls) return false;
  if (user.role === 'admin') {
    return !!cls.institution_id && !!user.institution_id && cls.institution_id === user.institution_id;
  }
  if (user.role === 'prof') {
    return cls.teacher_id === user.id;
  }
  return false;
}

// Établissement : seul un admin rattaché à une institution pilote ses profs.
function canActAsAdmin(user) {
  return !!user && user.role === 'admin' && !!user.institution_id;
}

// Résumé par professeur pour la vue d'ensemble établissement.
// profEntries: [{ profId, username, classCount, studentsData: [progress.data, …] }]
function institutionProfSummary(profEntries, now) {
  return profEntries.map((p) => {
    const studentsData = Array.isArray(p.studentsData) ? p.studentsData : [];
    const agg = aggregateClass(studentsData, now);
    let lastActivity = null;
    for (const d of studentsData) {
      const s = studentSummary(d, now);
      if (s.lastTest != null && (lastActivity == null || s.lastTest > lastActivity)) lastActivity = s.lastTest;
    }
    return {
      profId: p.profId,
      username: p.username,
      classCount: p.classCount || 0,
      studentCount: agg.total,
      activeThisWeek: agg.activeThisWeek,
      avgWpm: agg.avgWpm,
      avgAcc: agg.avgAcc,
      lastActivity,
    };
  });
}

/* ───────────────────────────────────────────────────────────────
   ESSAIS — logique pure (validation, comptage, signaux de frappe).
   Le contenu d'un essai est un objet { champ: texte } stocké en jsonb :
   ajouter un type ne touche pas au schéma.
   ─────────────────────────────────────────────────────────────── */

// Types d'essai et leurs champs. `key` = clé dans content, `multiline` = <textarea>.
// `counted` = le champ entre dans le compte de mots (un objet de mail ne compte pas).
const ESSAY_TYPES = {
  mail: {
    label: 'Mail',
    fields: [
      { key: 'to', label: 'Destinataire', multiline: false, counted: false },
      { key: 'subject', label: 'Objet', multiline: false, counted: false },
      { key: 'body', label: 'Corps du message', multiline: true, counted: true },
    ],
  },
  histoire: {
    label: 'Histoire',
    fields: [
      { key: 'title', label: 'Titre', multiline: false, counted: false },
      { key: 'body', label: 'Récit', multiline: true, counted: true },
    ],
  },
  transcription: {
    label: 'Transcription',
    fields: [{ key: 'body', label: 'Transcription', multiline: true, counted: true }],
  },
  lettre: {
    label: 'Lettre formelle',
    fields: [
      { key: 'from', label: 'Expéditeur', multiline: false, counted: false },
      { key: 'to', label: 'Destinataire', multiline: false, counted: false },
      { key: 'subject', label: 'Objet', multiline: false, counted: false },
      { key: 'body', label: 'Corps de la lettre', multiline: true, counted: true },
      { key: 'closing', label: 'Formule de politesse', multiline: false, counted: false },
    ],
  },
  'compte-rendu': {
    label: 'Compte-rendu',
    fields: [
      { key: 'title', label: 'Titre', multiline: false, counted: false },
      { key: 'body', label: 'Compte-rendu', multiline: true, counted: true },
    ],
  },
  dissertation: {
    label: 'Dissertation',
    fields: [
      { key: 'title', label: 'Titre', multiline: false, counted: false },
      { key: 'intro', label: 'Introduction', multiline: true, counted: true },
      { key: 'dev', label: 'Développement', multiline: true, counted: true },
      { key: 'ccl', label: 'Conclusion', multiline: true, counted: true },
    ],
  },
  note: {
    label: 'Note libre',
    fields: [
      { key: 'title', label: 'Titre', multiline: false, counted: false },
      { key: 'body', label: 'Texte', multiline: true, counted: true },
    ],
  },
};

function essayTypeDef(type) {
  return ESSAY_TYPES[type] || null;
}

function countWords(s) {
  if (!s || typeof s !== 'string') return 0;
  const m = s.trim().match(/[\p{L}\p{N}'’-]+/gu);
  return m ? m.length : 0;
}

// Mots d'un contenu, limité aux champs `counted` du type.
function essayWordCount(type, content) {
  const def = essayTypeDef(type);
  if (!def || !content) return 0;
  return def.fields
    .filter((f) => f.counted)
    .reduce((n, f) => n + countWords(content[f.key]), 0);
}

// Nettoie le contenu reçu : ne garde que les champs connus du type, en texte,
// borné à 20 000 caractères par champ (garde-fou payload).
function sanitizeEssayContent(type, raw) {
  const def = essayTypeDef(type);
  if (!def) return null;
  const out = {};
  for (const f of def.fields) {
    const v = raw && raw[f.key];
    out[f.key] = typeof v === 'string' ? v.slice(0, 20000) : '';
  }
  return out;
}

// Valide un rendu contre les consignes. Retourne { ok, error }.
function validateEssaySubmission(assignment, content) {
  const type = assignment.essay_type;
  const def = essayTypeDef(type);
  if (!def) return { ok: false, error: 'Type d’essai inconnu.' };
  for (const f of def.fields) {
    if (f.counted && !String(content[f.key] || '').trim()) {
      return { ok: false, error: `Le champ « ${f.label} » est vide.` };
    }
  }
  const words = essayWordCount(type, content);
  const min = assignment.min_words, max = assignment.max_words;
  if (min && words < min) return { ok: false, error: `Minimum ${min} mots (tu en as ${words}).` };
  if (max && words > max) return { ok: false, error: `Maximum ${max} mots (tu en as ${words}).` };
  return { ok: true, words };
}

// Consignes de création d'un essai côté prof. Retourne { ok, error, value }.
function validateEssayBrief(body) {
  const type = body.essayType;
  if (!essayTypeDef(type)) return { ok: false, error: 'Type d’essai inconnu.' };
  const toInt = (v) => {
    if (v == null || v === '') return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const min = toInt(body.minWords), max = toInt(body.maxWords);
  if (min && max && min > max) return { ok: false, error: 'Le minimum de mots dépasse le maximum.' };
  return {
    ok: true,
    value: {
      essay_type: type,
      essay_brief: (body.essayBrief || '').trim().slice(0, 5000) || null,
      min_words: min,
      max_words: max,
    },
  };
}

/* ── Signaux d'écriture ──────────────────────────────────────────
   Pas de verdict automatique : on mesure, le prof juge. Un faux positif
   qui accuse un élève honnête coûte plus cher qu'une triche qui passe.

   stats (envoyées par le client) :
     pasteAttempts  nb de collages bloqués
     bigInserts     nb d'insertions > 30 caractères d'un coup
     insertedChars  total de caractères arrivés par insertion massive
     typedChars     caractères saisis touche à touche
     activeMs       temps d'écriture actif (hors pauses > 5 s)
     durationMs     temps total entre ouverture et rendu
─────────────────────────────────────────────────────────────────── */
function essayWritingSignals(stats, words, opts = {}) {
  const s = stats || {};
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
  const pasteAttempts = num(s.pasteAttempts);
  const bigInserts = num(s.bigInserts);
  const insertedChars = num(s.insertedChars);
  const typedChars = num(s.typedChars);
  const activeMs = num(s.activeMs);
  const totalChars = typedChars + insertedChars;

  // Vitesse apparente sur le temps réellement actif.
  const activeMin = activeMs / 60000;
  const apparentWpm = activeMin > 0.05 ? Math.round(words / activeMin) : null;

  // Part du texte arrivée autrement qu'au clavier.
  const insertedRatio = totalChars > 0 ? insertedChars / totalChars : 0;

  const flags = [];
  if (pasteAttempts > 0) flags.push({ code: 'paste', label: `${pasteAttempts} collage(s) bloqué(s)` });
  if (bigInserts > 0) flags.push({ code: 'insert', label: `${bigInserts} insertion(s) massive(s)` });
  if (insertedRatio >= 0.2) flags.push({ code: 'ratio', label: `${Math.round(insertedRatio * 100)} % du texte non tapé` });

  // Vitesse incohérente : comparée à la moyenne connue de l'élève (baseline),
  // pas à un seuil absolu — un élève rapide n'est pas un tricheur.
  const baseline = typeof opts.baselineWpm === 'number' && opts.baselineWpm > 0 ? opts.baselineWpm : null;
  if (apparentWpm != null && baseline && apparentWpm > baseline * 2 && apparentWpm > 60) {
    flags.push({ code: 'speed', label: `${apparentWpm} mpm apparents vs ${baseline} habituels` });
  }

  return {
    apparentWpm,
    insertedRatio: Math.round(insertedRatio * 100) / 100,
    pasteAttempts,
    bigInserts,
    activeMs,
    durationMs: num(s.durationMs),
    flags,
    suspicion: flags.length === 0 ? 'none' : flags.length >= 2 ? 'high' : 'low',
  };
}

// Nettoie les stats client avant stockage (elles sont déclaratives : bornées, jamais crues).
function sanitizeEssayStats(raw) {
  const s = raw || {};
  const clamp = (v, max) => {
    const n = typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
    return Math.min(n, max);
  };
  return {
    pasteAttempts: clamp(s.pasteAttempts, 1000),
    bigInserts: clamp(s.bigInserts, 1000),
    insertedChars: clamp(s.insertedChars, 200000),
    typedChars: clamp(s.typedChars, 200000),
    activeMs: clamp(s.activeMs, 24 * 3600 * 1000),
    durationMs: clamp(s.durationMs, 24 * 3600 * 1000),
  };
}

module.exports = { studentSummary, aggregateClass, detectAlerts, dailySeries, canActAsTeacher, canManageClass, canActAsAdmin, institutionProfSummary, WEEK_MS,
  ESSAY_TYPES, essayTypeDef, countWords, essayWordCount, sanitizeEssayContent, validateEssaySubmission, validateEssayBrief, essayWritingSignals, sanitizeEssayStats };
