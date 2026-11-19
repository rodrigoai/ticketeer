const dns = require('node:dns');
const https = require('node:https');
const { BlockList, isIP } = require('node:net');
const { PNG } = require('pngjs');

const maxImageBytes = 4 * 1024 * 1024;
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const nonPublicAddresses = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]
]) {
  nonPublicAddresses.addSubnet(address, prefix);
}

// Validate the address used for the connection itself, including after redirects.
function lookupPublicAddress(hostname, options, callback) {
  dns.lookup(hostname, { ...options, family: 4, all: false }, (error, address, family) => {
    if (error) return callback(error);
    if (family !== 4 || nonPublicAddresses.check(address)) {
      return callback(new Error('Cover image host is not public'));
    }
    callback(null, address, family);
  });
}

async function readImage(url, signal, redirects = 2) {
  if (url.protocol !== 'https:' || url.port || url.username || url.password ||
      isIP(url.hostname.replace(/^\[|\]$/g, ''))) return null;

  const response = await new Promise((resolve, reject) => {
    https.get(url, {
      agent: false,
      lookup: lookupPublicAddress,
      family: 4,
      autoSelectFamily: false,
      signal
    }, resolve).on('error', reject);
  });

  if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location && redirects) {
    response.destroy();
    return readImage(new URL(response.headers.location, url), signal, redirects - 1);
  }

  if (response.statusCode !== 200 || Number(response.headers['content-length']) > maxImageBytes) {
    response.destroy();
    return null;
  }

  const chunks = [];
  let bytes = 0;
  for await (const chunk of response) {
    bytes += chunk.length;
    if (bytes > maxImageBytes) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function prepareImage(image) {
  if (!image) return null;
  if (image[0] === 0xff && image[1] === 0xd8) return image;
  if (image.length < 33 || !image.subarray(0, 8).equals(pngSignature) ||
      image.readUInt32BE(8) !== 13 || image.toString('ascii', 12, 16) !== 'IHDR') return null;

  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  if (!width || !height || width * height > 4_000_000 || image[28] !== 0) return null;

  for (let offset = 33; offset + 12 <= image.length;) {
    if (image.toString('ascii', offset + 4, offset + 8) === 'IHDR') return null;
    offset += image.readUInt32BE(offset) + 12;
  }

  // Decode and re-encode optional artwork so malformed PNG data cannot break PDFKit's asynchronous embedding.
  return PNG.sync.write(PNG.sync.read(image));
}

module.exports = async function loadTicketCover(event) {
  const signal = AbortSignal.timeout(2500);
  const candidates = new Set([event.mobileEventImageUrl, event.eventImageUrl].filter(Boolean));

  for (const candidate of candidates) {
    try {
      const image = prepareImage(await readImage(new URL(candidate), signal));
      if (image) return image;
    } catch {
      // The ticket remains printable when the optional cover is unreachable.
    }
  }
  return null;
};
