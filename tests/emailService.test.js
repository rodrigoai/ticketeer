const mockSend = jest.fn().mockResolvedValue({ MessageId: 'message-123' });

jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn(() => ({
    send: mockSend
  })),
  SendEmailCommand: jest.fn(function SendEmailCommand(input) {
    this.input = input;
  }),
  SendRawEmailCommand: jest.fn(function SendRawEmailCommand(input) {
    this.input = input;
  })
}));

jest.mock('../services/qrCodeService', () => ({
  generateQrCodeForTicket: jest.fn().mockResolvedValue({
    hash: 'qr-hash',
    buffer: Buffer.from('qr-code')
  }),
  generateQrCodeDataUrl: jest.fn().mockResolvedValue({
    dataUrl: 'data:image/png;base64,cXItY29kZQ=='
  })
}));

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.APP_TIMEZONE = 'America/Sao_Paulo';
  });

  test('formats QR code email event datetime in the app timezone', async () => {
    const emailService = require('../services/emailService');
    const eventDate = new Date('2026-05-08T23:00:00.000Z');

    const html = emailService.generateQrCodeEmailTemplate({
      eventName: 'Festival',
      eventVenue: 'Arena',
      eventDate,
      ticketNumber: 42,
      buyerName: 'Joao Silva',
      qrCodeDataUrl: 'data:image/png;base64,cXItY29kZQ==',
      qrCodeHash: 'qr-hash'
    });

    expect(html).toContain('20:00');
    expect(html).not.toContain('23:00');

    await emailService.sendTicketQrCodeEmail(
      'buyer@example.com',
      {
        id: 1,
        eventId: 10,
        identificationNumber: 42,
        buyer: 'Joao Silva'
      },
      {
        name: 'Festival',
        venue: 'Arena',
        date: eventDate
      },
      'auth0|organizer'
    );

    const rawEmail = mockSend.mock.calls[0][0].input.RawMessage.Data;
    expect(rawEmail).toContain('Data: 08/05/2026, 20:00');
    expect(rawEmail).not.toContain('Data: 08/05/2026, 23:00');
  });

  test('renders confirmation email with prominent event details and high contrast CTA', () => {
    const emailService = require('../services/emailService');

    const html = emailService.generateConfirmationEmailTemplate({
      eventName: 'Festival',
      confirmationUrl: 'https://ticketeer.test/confirmation/hash',
      orderId: 'order-123',
      totalTickets: 3
    });

    expect(html).toContain('class="summary-box"');
    expect(html).toContain('Festival');
    expect(html).toContain('Pedido:</span> <span class="summary-value">order-123</span>');
    expect(html).toContain('Ingressos:</span> <span class="summary-value">3</span>');
    expect(html).toContain('background: #111827');
    expect(html).toContain('color: #ffffff !important');
    expect(html).toContain('Confirmar informações');
  });

  test('renders QR code ticket email with prominent ticket details and high contrast QR panel', () => {
    const emailService = require('../services/emailService');

    const html = emailService.generateQrCodeEmailTemplate({
      eventName: 'Festival',
      eventVenue: 'Arena',
      eventDate: new Date('2026-05-08T23:00:00.000Z'),
      ticketNumber: 42,
      buyerName: 'Joao Silva',
      qrCodeDataUrl: 'data:image/png;base64,cXItY29kZQ==',
      qrCodeHash: 'qr-hash'
    });

    expect(html).toContain('class="ticket-info"');
    expect(html).toContain('class="summary-title">📅 Festival</h3>');
    expect(html).toContain('Número:</span> <span class="ticket-number">#42</span>');
    expect(html).toContain('Portador:</span> <span class="summary-value">Joao Silva</span>');
    expect(html).toContain('border: 3px solid #111827');
    expect(html).toContain('Código QR de Acesso');
  });
});
