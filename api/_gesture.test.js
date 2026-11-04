// Gestes déduits des modèles de disposition (scripts/gesture.js), utilisés pour piloter de vraies frappes.
// Lancer : node --test api/_gesture.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { gestureFor } = require('../scripts/gesture');
const model = (id) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'layouts-src', id + '.json'), 'utf8'));
const g = (id, ch) => { const r = gestureFor(model(id), ch); return r && r.map((p) => [p.code, p.shift ? 'Maj' : '', p.alt ? 'Alt' : ''].filter(Boolean).join('+')).join(' puis '); };

test('Windows US international : é par AltGr+E, ç par AltGr+virgule, accent grave puis lettre', () => {
  assert.equal(g('windows-us-intl', 'é'), 'KeyE+Alt');
  assert.equal(g('windows-us-intl', 'ç'), 'Comma+Alt');
  assert.equal(g('windows-us-intl', 'è'), 'Backquote puis KeyE');
});
test("Windows US international : l'apostrophe se tape par touche morte puis Espace, œ est impossible", () => {
  assert.equal(g('windows-us-intl', "'"), 'Quote puis Space');
  assert.equal(g('windows-us-intl', 'œ'), null);
});
test('Windows Royaume-Uni de base : é possible, è impossible', () => {
  assert.equal(g('windows-uk', 'é'), 'KeyE+Alt');
  assert.equal(g('windows-uk', 'è'), null);
});
test('macOS U.S. : é par Option+E puis E, œ par Option+Q, « par Option+barre oblique inverse', () => {
  assert.equal(g('mac-us', 'é'), 'KeyE+Alt puis KeyE');
  assert.equal(g('mac-us', 'œ'), 'KeyQ+Alt');
  assert.equal(g('mac-us', '«'), 'Backslash+Alt');
});
test('une lettre simple et une majuscule', () => {
  assert.equal(g('windows-us-intl', 'a'), 'KeyA');
  assert.equal(g('windows-us-intl', 'A'), 'KeyA+Maj');
  assert.equal(g('windows-us-intl', ' '), 'Space');
});
