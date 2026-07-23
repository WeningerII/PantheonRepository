// The PD/CC0 license gate is the enforcement point of the owner's hard rule
// (docs/image-licensing.md): only Public Domain / PD-old / PD-art / CC0 pass;
// every encumbered or unknown license, and every non-copyright restriction,
// is rejected. Fixtures mirror the real Commons imageinfo extmetadata shape
// ({value, source} per field, Artist as HTML).
const { test } = require('node:test');
const assert = require('node:assert');
const { classify, htmlToText } = require('../scripts/lib/commons-license.cjs');

const ext = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v, source: 'commons' }]));

test('ACCEPT: PD-old painting (2D art by a long-dead artist)', () => {
  const v = classify(ext({
    License: 'pd-old-100-expired', LicenseShortName: 'Public domain',
    Copyrighted: 'False', Artist: '<a href="//commons.wikimedia.org/wiki/User:X">Rembrandt</a>',
    UsageTerms: 'Public domain',
  }));
  assert.strictEqual(v.accept, true, v.reason);
  assert.strictEqual(v.author, 'Rembrandt');
  assert.match(v.authorUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/User:X$/);
});

test('ACCEPT: CC0', () => {
  const v = classify(ext({ License: 'cc-zero', LicenseShortName: 'CC0', LicenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', Copyrighted: 'False' }));
  assert.strictEqual(v.accept, true, v.reason);
});

test('ACCEPT: bare Copyrighted=False with no machine key', () => {
  const v = classify(ext({ Copyrighted: 'False', UsageTerms: 'Public domain' }));
  assert.strictEqual(v.accept, true, v.reason);
});

test('ACCEPT: PD-art', () => {
  const v = classify(ext({ License: 'pd-art', LicenseShortName: 'Public domain', Copyrighted: 'False' }));
  assert.strictEqual(v.accept, true, v.reason);
});

test('REJECT: CC BY 4.0 (attribution required)', () => {
  const v = classify(ext({ License: 'cc-by-4.0', LicenseShortName: 'CC BY 4.0', Copyrighted: 'True' }));
  assert.strictEqual(v.accept, false);
  assert.match(v.reason, /encumbered/);
});

test('REJECT: CC BY-SA 3.0 (share-alike)', () => {
  const v = classify(ext({ License: 'cc-by-sa-3.0', LicenseShortName: 'CC BY-SA 3.0', Copyrighted: 'True' }));
  assert.strictEqual(v.accept, false);
});

test('REJECT: GFDL', () => {
  const v = classify(ext({ License: 'gfdl', LicenseShortName: 'GFDL', Copyrighted: 'True' }));
  assert.strictEqual(v.accept, false);
});

test('REJECT: no license and copyrighted', () => {
  const v = classify(ext({ Copyrighted: 'True', UsageTerms: 'All rights reserved' }));
  assert.strictEqual(v.accept, false);
});

test('REJECT: unknown/ungated license key even without an encumbrance token', () => {
  const v = classify(ext({ License: 'some-bespoke-tag', Copyrighted: 'True' }));
  assert.strictEqual(v.accept, false);
  assert.match(v.reason, /unrecognized|ungated/);
});

test('REJECT: PD file but Restrictions present (trademark/personality veto)', () => {
  const v = classify(ext({ License: 'pd-old-100', Copyrighted: 'False', Restrictions: 'trademarked|personality' }));
  assert.strictEqual(v.accept, false);
  assert.match(v.reason, /restrictions/);
  assert.strictEqual(v.restrictions, 'trademarked|personality');
});

test('REJECT: empty extmetadata', () => {
  assert.strictEqual(classify({}).accept, false);
  assert.strictEqual(classify(undefined).accept, false);
});

test('htmlToText strips markup and decodes entities', () => {
  assert.strictEqual(htmlToText('<a href="#">Jan&nbsp;van&nbsp;Eyck</a> &amp; workshop'), 'Jan van Eyck & workshop');
});
