const { sb, getCurrentChallenge } = require('./_boss-shared');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ch = await getCurrentChallenge();
  if (!ch) return res.status(500).json({ error: 'Défi indisponible.' });

  const secondsLeft = Math.max(0, Math.floor((new Date(ch.ends_at).getTime() - Date.now()) / 1000));
  res.json({
    id: ch.id,
    isoWeek: ch.iso_week,
    text: ch.text,
    startsAt: ch.starts_at,
    endsAt: ch.ends_at,
    secondsLeft,
  });
};
