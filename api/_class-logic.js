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

module.exports = { studentSummary, aggregateClass, detectAlerts, dailySeries, canActAsTeacher, canManageClass, canActAsAdmin, institutionProfSummary, WEEK_MS };
