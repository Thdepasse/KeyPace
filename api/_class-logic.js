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

module.exports = { studentSummary, aggregateClass, detectAlerts, canActAsTeacher, canManageClass, WEEK_MS };
