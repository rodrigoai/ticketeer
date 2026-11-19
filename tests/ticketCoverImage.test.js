const dns = require('node:dns');
const https = require('node:https');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { PNG } = require('pngjs');
const loadTicketCover = require('../services/ticketCoverImage');

const png = PNG.sync.write(new PNG({ width: 2, height: 3 }));

function mockDownload(responses) {
  return jest.spyOn(https, 'get').mockImplementation((url, options, onResponse) => {
    const request = new EventEmitter();
    queueMicrotask(() => {
      options.lookup(url.hostname, {}, error => {
        if (error) return request.emit('error', error);
        const { statusCode = 200, headers = {}, bytes = png } = responses[url.hostname];
        const response = new PassThrough();
        Object.assign(response, { statusCode, headers });
        onResponse(response);
        response.end(bytes);
      });
    });
    return request;
  });
}

beforeEach(() => {
  jest.spyOn(dns, 'lookup').mockImplementation((hostname, options, callback) => {
    callback(null, hostname === 'private.example' ? '192.168.1.10' : '93.184.215.14', 4);
  });
});
afterEach(() => jest.restoreAllMocks());

test('prefers the mobile event cover and prepares it for PDF embedding', async () => {
  const download = mockDownload({ 'mobile.example': {} });

  const cover = await loadTicketCover({
    mobileEventImageUrl: 'https://mobile.example/cover.png',
    eventImageUrl: 'https://desktop.example/cover.png'
  });

  expect(PNG.sync.read(cover)).toMatchObject({ width: 2, height: 3 });
  expect(download).toHaveBeenCalledTimes(1);
});

test('falls back to the desktop cover when mobile artwork is malformed', async () => {
  const corrupted = Buffer.from(png);
  corrupted[32] ^= 0xff;
  mockDownload({ 'mobile.example': { bytes: corrupted }, 'desktop.example': {} });

  const cover = await loadTicketCover({
    mobileEventImageUrl: 'https://mobile.example/cover.png',
    eventImageUrl: 'https://desktop.example/cover.png'
  });

  expect(PNG.sync.read(cover)).toMatchObject({ width: 2, height: 3 });
});

test('uses the branded fallback when a redirect resolves to a private address', async () => {
  mockDownload({
    'mobile.example': { statusCode: 302, headers: { location: 'https://private.example/cover.png' } }
  });

  await expect(loadTicketCover({ mobileEventImageUrl: 'https://mobile.example/cover.png' })).resolves.toBeNull();
  expect(dns.lookup).toHaveBeenCalledWith('private.example', expect.objectContaining({ family: 4 }), expect.any(Function));
});
