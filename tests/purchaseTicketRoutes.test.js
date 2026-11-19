jest.mock('../services/cartPurchaseService', () => ({ confirm: jest.fn() }));
jest.mock('../services/ticketPdfService', () => ({ generate: jest.fn() }));
jest.mock('../services/qrCodeService', () => ({ generateQrCodeDataUrl: jest.fn() }));
jest.mock('../services/ticketService', () => ({ getTicketById: jest.fn() }));
jest.mock('../services/ticketWalletService', () => ({ getCapabilities: jest.fn(), apple: jest.fn(), google: jest.fn() }));
const purchaseService = require('../services/cartPurchaseService');
const pdf = require('../services/ticketPdfService');
const qrCodeService = require('../services/qrCodeService');
const ticketService = require('../services/ticketService');
const wallet = require('../services/ticketWalletService');
const createRoutes = require('../routes/purchaseTicketRoutes');
const requiresAuth = jest.fn();
const router = createRoutes({ requiresAuth });
const handler = router.stack[0].route.stack[0].handle;
const organizerRoute = router.stack.find(layer => layer.route.path === '/tickets/:id/printable').route;
const organizerHandler = organizerRoute.stack[1].handle;
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
const organizerRequest = () => organizerHandler({ params: { id: '10' }, auth: { payload: { sub: 'organizer' } } }, response);

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

test('renders the same ticket PDF for the organizer and opens it inline', async () => {
  const date = new Date('2026-11-20T22:00:00Z');
  const storedTicket = {
    ...ticket,
    order: 'ORDER-01',
    buyer: null,
    table: 8,
    event: {
      name: 'Festival',
      venue: 'Arena',
      opening_datetime: date,
      event_image_url: 'https://example.com/cover.jpg',
      mobile_event_image_url: 'https://example.com/cover-mobile.jpg'
    }
  };
  ticketService.getTicketById.mockResolvedValue(storedTicket);
  qrCodeService.generateQrCodeDataUrl.mockResolvedValue({ dataUrl: 'data:image/png;base64,dGlja2V0' });

  await organizerRequest();

  expect(organizerRoute.stack[0].handle).toBe(requiresAuth);
  expect(ticketService.getTicketById).toHaveBeenCalledWith('10', 'organizer');
  expect(qrCodeService.generateQrCodeDataUrl).toHaveBeenCalledWith(storedTicket, 'organizer');
  expect(pdf.generate).toHaveBeenCalledWith({
    name: 'Festival',
    venue: 'Arena',
    date,
    eventImageUrl: 'https://example.com/cover.jpg',
    mobileEventImageUrl: 'https://example.com/cover-mobile.jpg'
  }, {
    ...storedTicket,
    qrCode: 'data:image/png;base64,dGlja2V0'
  });
  expect(response.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
  expect(response.set).toHaveBeenCalledWith('Content-Type', 'application/pdf');
  expect(response.set).toHaveBeenCalledWith('Content-Disposition', 'inline; filename="ingresso-42.pdf"');
  expect(response.send).toHaveBeenCalledWith(Buffer.from('pdf'));
});

test('rejects organizer printing for tickets without an order or outside the organizer’s event', async () => {
  ticketService.getTicketById
    .mockResolvedValueOnce({ ...ticket, order: null })
    .mockRejectedValueOnce(new Error('Failed to fetch ticket: Access denied'));

  await organizerRequest();
  await organizerRequest();

  expect(response.status.mock.calls).toEqual([[400], [404]]);
  expect(qrCodeService.generateQrCodeDataUrl).not.toHaveBeenCalled();
  expect(pdf.generate).not.toHaveBeenCalled();
});
