const { sb, getCurrentChallenge } = require('./_boss-shared');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { token } = req.body || {};
  const ch = await getCurrentChallenge();
  if (!ch) return res.status(500).json({ error: 'Défi indisponible.' });

  // Top 100
  const top = await sb(`/weekly_scores?challenge_id=eq.${ch.id}&select=username,score,wpm,accuracy&order=score.desc&limit=100`);
  const rows = (top.data || []).map((r, i) => ({ rank: i + 1, ...r }));

  let me = null;
  if (token) {
    const ur = await sb(`/users?session_token=eq.${encodeURIComponent(token)}&select=id,username`);
    const user = ur.data && ur.data[0];
    if (user) {
      const mine = await sb(`/weekly_scores?challenge_id=eq.${ch.id}&user_id=eq.${user.id}&select=username,score,wpm,accuracy`);
      const row = mine.data && mine.data[0];
      if (row) {
        // rang = nombre de scores strictement supérieurs + 1
        const better = await sb(`/weekly_scores?challenge_id=eq.${ch.id}&score=gt.${row.score}&select=id`);
        me = { rank: (better.data ? better.data.length : 0) + 1, ...row };
      }
    }
  }

  res.json({ challengeId: ch.id, isoWeek: ch.iso_week, count: rows.length, top: rows, me });
};
