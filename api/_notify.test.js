const test = require('node:test');
const assert = require('node:assert');
const { notifyTeam, checkoutClickedEmail, subscribedEmail, formatAmount } = require('./_notify');

test('formatAmount : centimes en euros, format belge', () => {
  assert.strictEqual(formatAmount(499, 'eur'), '4,99 €');
  assert.strictEqual(formatAmount(1000, 'usd'), '10,00 USD');
  assert.strictEqual(formatAmount(null, 'eur'), '—');
});

test('les mails échappent les données utilisateur', () => {
  const m = checkoutClickedEmail({ username: '<script>x</script>', email: 'a@b.c' });
  assert.ok(!m.html.includes('<script>x'));
  assert.ok(m.html.includes('&lt;script&gt;'));
});

test('mail nouvel abonné : réduction affichée seulement si présente', () => {
  assert.ok(!subscribedEmail({ username: 'u', amount: 499, currency: 'eur' }).html.includes('Réduction'));
  assert.ok(subscribedEmail({ username: 'u', amount: 0, currency: 'eur', discount: 499 }).html.includes('Réduction'));
});

test('notifyTeam sans RESEND_API_KEY : false, sans lever', async () => {
  const prev = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  assert.strictEqual(await notifyTeam(checkoutClickedEmail({ username: 'u' })), false);
  if (prev !== undefined) process.env.RESEND_API_KEY = prev;
});
