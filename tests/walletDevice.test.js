const fs = require('fs');
const path = require('path');
const { transformSync } = require('esbuild');
const loaded = { exports: {} };
new Function('module', 'exports', transformSync(fs.readFileSync(path.join(__dirname, '../src/utils/wallet.js'), 'utf8'), { format: 'cjs' }).code)(loaded, loaded.exports);
const { getWalletPlatforms } = loaded.exports;
const available = { apple: true, google: true };

test.each([
  [{ userAgent: 'iPhone Safari' }, ['apple']],
  [{ userAgent: 'iPad Safari' }, ['apple']],
  [{ userAgent: 'Mozilla Macintosh', platform: 'MacIntel', maxTouchPoints: 5 }, ['apple']],
  [{ userAgent: 'Android Chrome' }, ['google']],
  [{ userAgent: 'Windows Chrome' }, ['apple', 'google']],
  [{ userAgent: 'Macintosh Safari', platform: 'MacIntel', maxTouchPoints: 0 }, ['apple', 'google']]
])('selects the right wallet for %j', (device, expected) => {
  expect(getWalletPlatforms(device, available)).toEqual(expected);
});

test('does not advertise an unconfigured or incompatible wallet', () => {
  expect(getWalletPlatforms({ userAgent: 'iPhone' }, { google: true })).toEqual([]);
  expect(getWalletPlatforms({ userAgent: 'Android' }, { apple: true })).toEqual([]);
  expect(getWalletPlatforms({}, {})).toEqual([]);
});
