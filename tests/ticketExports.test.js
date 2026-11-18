const crypto = require('crypto');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const forge = require('node-forge');
const { unzipSync } = require('fflate');
const pdf = require('../services/ticketPdfService');
const wallet = require('../services/ticketWalletService');
const event = { name: 'Festival de Jazz & Blues', publicHash: 'public-event', date: '2026-11-20T22:00:00.000Z', venue: 'Parque Municipal' };
const ticket = { id: 10, identificationNumber: 42, description: 'Pista', buyer: 'Maria Oliveira', buyerEmail: 'maria@example.com', qrCodeValue: 'same-admission-qr' };
let originalEnv;
beforeEach(() => { originalEnv = process.env; process.env = { ...originalEnv }; });
afterEach(() => { process.env = originalEnv; });

test('generates a single-page PDF with an embedded admission QR', async () => {
  const qrCode = await QRCode.toDataURL(ticket.qrCodeValue);
  const data = await pdf.generate(event, { ...ticket, qrCode });
  expect(data.subarray(0, 5).toString()).toBe('%PDF-');
  expect((data.toString('latin1').match(/\/Type \/Page\b/g) || [])).toHaveLength(1);
  expect(data.toString('latin1')).toContain('/Subtype /Image');
  expect(pdf.formatDate(event.date)).toContain('19:00');
});

test('Google Wallet JWT has a valid RSA signature, stable event IDs, owner and the exact admission QR', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  Object.assign(process.env, { GOOGLE_WALLET_ISSUER_ID: '123', GOOGLE_WALLET_CLIENT_EMAIL: 'wallet@example.com', GOOGLE_WALLET_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }) });
  const url = wallet.google(event, ticket);
  const token = url.split('/save/')[1];
  const claims = jwt.verify(token, publicKey, { algorithms: ['RS256'], audience: 'google' });
  expect(claims.typ).toBe('savetowallet');
  expect(claims.payload.eventTicketClasses[0]).toEqual(expect.objectContaining({ id: '123.ticketeer_public-event', eventName: { defaultValue: { language: 'pt-BR', value: event.name } } }));
  expect(claims.payload.eventTicketObjects[0]).toEqual(expect.objectContaining({ id: '123.ticketeer_public-event_10', ticketHolderName: ticket.buyer, barcode: expect.objectContaining({ value: ticket.qrCodeValue }) }));
  expect(url).not.toContain('PRIVATE');
});

test('Apple Wallet exports a signed archive with owner, email, icons and the same admission QR', () => {
  const pair = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = pair.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 86400000);
  cert.setSubject([{ name: 'commonName', value: 'Test pass signing certificate' }]);
  cert.setIssuer(cert.subject.attributes);
  cert.sign(pair.privateKey, forge.md.sha256.create());
  Object.assign(process.env, {
    APPLE_WALLET_PASS_TYPE_ID: 'pass.com.example.ticketeer', APPLE_WALLET_TEAM_ID: 'TESTTEAMID',
    APPLE_WALLET_SIGNER_CERT: forge.pki.certificateToPem(cert), APPLE_WALLET_SIGNER_KEY: forge.pki.privateKeyToPem(pair.privateKey),
    APPLE_WALLET_WWDR_CERT: forge.pki.certificateToPem(cert)
  });
  const archive = unzipSync(wallet.apple(event, ticket));
  const pass = JSON.parse(Buffer.from(archive['pass.json']).toString());
  expect(pass.serialNumber).toBe('ticketeer-public-event-10');
  expect(pass.barcodes[0].message).toBe(ticket.qrCodeValue);
  expect(pass.eventTicket.secondaryFields[0].value).toBe(ticket.buyer);
  expect(pass.eventTicket.backFields.find(field => field.key === 'email').value).toBe(ticket.buyerEmail);
  expect(archive['icon.png']).toBeTruthy();
  expect(archive.signature.length).toBeGreaterThan(100);
  const manifest = JSON.parse(Buffer.from(archive['manifest.json']).toString());
  expect(manifest['pass.json']).toBe(crypto.createHash('sha1').update(archive['pass.json']).digest('hex'));
});

test('wallet capabilities remain off without issuer credentials', () => {
  for (const key of Object.keys(process.env)) if (/^(APPLE_WALLET|GOOGLE_WALLET)_/.test(key)) delete process.env[key];
  expect(wallet.getCapabilities()).toEqual({ apple: false, google: false });
  expect(() => wallet.apple(event, ticket)).toThrow('not configured');
  expect(() => wallet.google(event, ticket)).toThrow('not configured');
});
