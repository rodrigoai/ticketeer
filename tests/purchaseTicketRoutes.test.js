jest.mock('../services/cartPurchaseService', () => ({ confirm: jest.fn() }));
jest.mock('../services/ticketPdfService', () => ({ generate: jest.fn() }));
jest.mock('../services/ticketWalletService', () => ({ getCapabilities: jest.fn(), apple: jest.fn(), google: jest.fn() }));
const purchaseService = require('../services/cartPurchaseService');
const pdf = require('../services/ticketPdfService');
const wallet = require('../services/ticketWalletService');
const createRoutes = require('../routes/purchaseTicketRoutes');
const handler = createRoutes().stack[0].route.stack[0].handle;
let response;
let ticket;
beforeEach(() => {
  jest.resetAllMocks();
  ticket = { id: 10, identificationNumber: 42, buyer: 'Maria', buyerEmail: 'maria@example.com', qrCodeValue: 'admission' };
  purchaseService.confirm.mockResolvedValue({ event: { name: 'Festival' }, tickets: [ticket] });
  pdf.generate.mockResolvedValue(Buffer.from('pdf'));
  wallet.getCapabilities.mockReturnValue({ apple: true, google: true });
  wallet.apple.mockReturnValue(Buffer.from('pkpass'));
  wallet.google.mockReturnValue('https://pay.google.com/gp/v/save/signed-token');
  response = { set: jest.fn().mockReturnThis(), status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn(), redirect: jest.fn() };
});
const request = (format, ticketId = '10') => handler({ params: { hash: 'public-event', purchaseId: 'purchase', ticketId, format } }, response);

test('downloads PDF only for a confirmed purchase and its own ticket', async () => {
  await request('pdf');
  expect(purchaseService.confirm).toHaveBeenCalledWith('public-event', 'purchase', { allowConfirmation: false });
  expect(pdf.generate).toHaveBeenCalledWith({ name: 'Festival', publicHash: 'public-event' }, ticket);
  expect(response.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
  expect(response.set).toHaveBeenCalledWith('Content-Type', 'application/pdf');
  expect(response.set).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="ingresso-42.pdf"');
  expect(response.send).toHaveBeenCalledWith(Buffer.from('pdf'));
});

test('rejects tickets outside the purchase and incomplete owner forms', async () => {
  await request('pdf', '999');
  expect(response.status).toHaveBeenCalledWith(404);
  purchaseService.confirm.mockResolvedValue({ tickets: [] });
  await request('pdf');
  expect(pdf.generate).not.toHaveBeenCalled();
});

test('returns signed Apple passes with the correct type and extension', async () => {
  await request('apple');
  expect(response.set).toHaveBeenCalledWith('Content-Type', 'application/vnd.apple.pkpass');
  expect(response.set).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="ingresso-42.pkpass"');
  expect(response.send).toHaveBeenCalledWith(Buffer.from('pkpass'));
});

test('redirects Google Wallet to the signed save link', async () => {
  await request('google');
  expect(response.redirect).toHaveBeenCalledWith(302, 'https://pay.google.com/gp/v/save/signed-token');
});

test.each(['apple', 'google'])('does not export unconfigured %s passes', async platform => {
  wallet.getCapabilities.mockReturnValue({});
  await request(platform);
  expect(response.status).toHaveBeenCalledWith(503);
  expect(wallet[platform]).not.toHaveBeenCalled();
});

test('rejects unknown export formats without looking up a purchase', async () => {
  await request('unknown');
  expect(response.status).toHaveBeenCalledWith(404);
  expect(purchaseService.confirm).not.toHaveBeenCalled();
});
