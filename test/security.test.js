const test = require('node:test');
const assert = require('node:assert/strict');

const utils = require('../js/utils.js');

test('normalizes tracking params and rejects non-http URLs', () => {
  assert.equal(
    utils.normalizeTrackedUrl('https://example.com/page?utm_source=x&foo=bar'),
    'https://example.com/page?foo=bar'
  );

  assert.equal(utils.isAllowedHttpUrl('javascript:alert(1)'), false);
  assert.equal(utils.isAllowedHttpUrl('https://example.com/test'), true);
});

test('encrypts and decrypts read-later data with a passphrase', async () => {
  const original = [{ title: 'Example', url: 'https://example.com', timestamp: 12345 }];
  const encrypted = await utils.encryptStoredData(original, 'secret-passphrase');

  assert.ok(encrypted && encrypted.encrypted === true);
  assert.notDeepEqual(encrypted.payload, original);

  const restored = await utils.decryptStoredData(encrypted, 'secret-passphrase');
  assert.deepEqual(restored, original);

  const wrong = await utils.decryptStoredData(encrypted, 'wrong-passphrase');
  assert.equal(wrong, null);
});
