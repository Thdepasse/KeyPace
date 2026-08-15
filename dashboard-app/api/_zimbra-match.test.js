// Tests de la classification Zimbra (sans IMAP réel).
// Lancer : node --test dashboard-app/api/_zimbra-match.test.js
const test = require('node:test');
const assert = require('node:assert');
const { classifyMessage, looksLikeSchoolOutreach, domainOf } = require('./_zimbra-match');

const NOW = 1_700_000_000_000;

test('domainOf : extrait le domaine ou chaîne vide', () => {
  assert.equal(domainOf('prof@athenee-namur.be'), 'athenee-namur.be');
  assert.equal(domainOf(''), '');
  assert.equal(domainOf(null), '');
});

test('entrant : réponse d\'un prospect existant => repondu', () => {
  const prospects = [{ id: 'p1', contact_email: 'prof@athenee.be', status: 'envoye' }];
  const action = classifyMessage({ direction: 'in', from: 'prof@athenee.be', subject: 'Re: licence' }, prospects, NOW);
  assert.deepEqual(action, { type: 'update-status', prospectId: 'p1', status: 'repondu' });
});

test('entrant : prospect déjà signé ou perdu => aucune action', () => {
  const prospects = [{ id: 'p1', contact_email: 'prof@athenee.be', status: 'signe' }];
  assert.equal(classifyMessage({ direction: 'in', from: 'prof@athenee.be', subject: 'merci' }, prospects, NOW), null);
});

test('entrant : expéditeur inconnu avec domaine pro + mot-clé école => création', () => {
  const action = classifyMessage(
    { direction: 'in', from: 'direction@college-victorhugo.fr', subject: 'Demande de licence pour notre collège' },
    [],
    NOW
  );
  assert.equal(action.type, 'create-prospect');
  assert.equal(action.contact_email, 'direction@college-victorhugo.fr');
  assert.equal(action.school_name, 'college-victorhugo.fr');
});

test('entrant : expéditeur inconnu sur messagerie grand public => aucune création', () => {
  const action = classifyMessage(
    { direction: 'in', from: 'jean.dupont@gmail.com', subject: 'Question sur une école' },
    [],
    NOW
  );
  assert.equal(action, null);
});

test('entrant : expéditeur pro sans mot-clé école => aucune création (évite les faux positifs)', () => {
  const action = classifyMessage(
    { direction: 'in', from: 'contact@fournisseur.com', subject: 'Facture de juillet' },
    [],
    NOW
  );
  assert.equal(action, null);
});

test('sortant : premier email à un prospect "à contacter" => envoye', () => {
  const prospects = [{ id: 'p1', contact_email: 'prof@athenee.be', status: 'a_contacter' }];
  const action = classifyMessage({ direction: 'out', to: 'prof@athenee.be', subject: 'Présentation KeyPace' }, prospects, NOW);
  assert.deepEqual(action, { type: 'update-status', prospectId: 'p1', status: 'envoye' });
});

test('sortant : email à un prospect déjà "envoye" => relance', () => {
  const prospects = [{ id: 'p1', contact_email: 'prof@athenee.be', status: 'envoye' }];
  const action = classifyMessage({ direction: 'out', to: 'prof@athenee.be', subject: 'Petite relance' }, prospects, NOW);
  assert.deepEqual(action, { type: 'update-status', prospectId: 'p1', status: 'relance' });
});

test('sortant : ne rétrograde jamais un dossier en négociation, signé ou perdu', () => {
  for (const status of ['en_negociation', 'signe', 'perdu']) {
    const prospects = [{ id: 'p1', contact_email: 'prof@athenee.be', status }];
    assert.equal(classifyMessage({ direction: 'out', to: 'prof@athenee.be', subject: 'suivi' }, prospects, NOW), null);
  }
});

test('sortant : destinataire inconnu => jamais de création automatique', () => {
  const action = classifyMessage({ direction: 'out', to: 'nouvelle-ecole@exemple.be', subject: 'Présentation' }, [], NOW);
  assert.equal(action, null);
});

test('looksLikeSchoolOutreach : combine domaine pro et mot-clé', () => {
  assert.equal(looksLikeSchoolOutreach('a@gmail.com', 'notre école'), false);
  assert.equal(looksLikeSchoolOutreach('a@lycee-x.fr', 'notre école'), true);
  assert.equal(looksLikeSchoolOutreach('a@lycee-x.fr', 'facture'), false);
});
