const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { formatDate } = require('./ticketPdfService');

const pem = value => String(value || '').replace(/\\n/g, '\n');
const localized = value => ({ defaultValue: { language: 'pt-BR', value: String(value) } });
const has = (...names) => names.every(name => Boolean(process.env[name]?.trim()));

class TicketWalletService {
  getCapabilities() {
    return {
      apple: has('APPLE_WALLET_PASS_TYPE_ID', 'APPLE_WALLET_TEAM_ID', 'APPLE_WALLET_SIGNER_CERT', 'APPLE_WALLET_SIGNER_KEY', 'APPLE_WALLET_WWDR_CERT'),
      google: has('GOOGLE_WALLET_ISSUER_ID', 'GOOGLE_WALLET_CLIENT_EMAIL', 'GOOGLE_WALLET_PRIVATE_KEY')
    };
  }

  google(event, ticket) {
    if (!this.getCapabilities().google) throw new Error('Google Wallet is not configured');
    const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
    // Public event hashes and stable ticket IDs prevent collisions between events and issuers.
    const classId = `${issuerId}.ticketeer_${event.publicHash}`;
    const objectId = `${issuerId}.ticketeer_${event.publicHash}_${ticket.id}`;
    const eventClass = {
      id: classId, issuerName: process.env.WALLET_ORGANIZATION_NAME || 'Ticketeer',
      reviewStatus: 'UNDER_REVIEW', eventName: localized(event.name),
      ...(event.venue ? { venue: { name: localized(event.venue), address: localized(event.venue) } } : {}),
      ...(event.date ? { dateTime: { start: new Date(event.date).toISOString() } } : {})
    };
    const object = {
      id: objectId, classId, state: 'ACTIVE',
      ticketHolderName: ticket.buyer || 'Titular', ticketNumber: String(ticket.identificationNumber),
      barcode: { type: 'QR_CODE', value: ticket.qrCodeValue, alternateText: `Ingresso #${ticket.identificationNumber}` },
      textModulesData: [{ id: 'ticket_type', header: 'Ingresso', body: ticket.description || 'Ingresso' }],
      ...(ticket.location || ticket.table ? { seatInfo: { seat: localized([ticket.location, ticket.table ? `Mesa ${ticket.table}` : ''].filter(Boolean).join(' · ')) } } : {})
    };
    const token = jwt.sign({
      iss: process.env.GOOGLE_WALLET_CLIENT_EMAIL, aud: 'google', typ: 'savetowallet',
      payload: { eventTicketClasses: [eventClass], eventTicketObjects: [object] }
    }, pem(process.env.GOOGLE_WALLET_PRIVATE_KEY), { algorithm: 'RS256' });
    return `https://pay.google.com/gp/v/save/${token}`;
  }

  apple(event, ticket) {
    if (!this.getCapabilities().apple) throw new Error('Apple Wallet is not configured');
    const { PKPass } = require('passkit-generator');
    const icons = {};
    for (const name of ['icon.png', 'icon@2x.png', 'icon@3x.png']) {
      icons[name] = fs.readFileSync(path.join(__dirname, '../assets/wallet', name));
    }
    const pass = new PKPass(icons, {
      wwdr: pem(process.env.APPLE_WALLET_WWDR_CERT),
      signerCert: pem(process.env.APPLE_WALLET_SIGNER_CERT),
      signerKey: pem(process.env.APPLE_WALLET_SIGNER_KEY),
      ...(process.env.APPLE_WALLET_KEY_PASSPHRASE ? { signerKeyPassphrase: process.env.APPLE_WALLET_KEY_PASSPHRASE } : {})
    }, {
      serialNumber: `ticketeer-${event.publicHash}-${ticket.id}`,
      description: event.name,
      organizationName: process.env.WALLET_ORGANIZATION_NAME || 'Ticketeer',
      passTypeIdentifier: process.env.APPLE_WALLET_PASS_TYPE_ID,
      teamIdentifier: process.env.APPLE_WALLET_TEAM_ID,
      logoText: 'Ticketeer', backgroundColor: 'rgb(51, 70, 207)', foregroundColor: 'rgb(255, 255, 255)', labelColor: 'rgb(222, 228, 255)'
    });
    pass.type = 'eventTicket';
    pass.primaryFields.push({ key: 'event', label: 'EVENTO', value: event.name });
    pass.secondaryFields.push({ key: 'owner', label: 'TITULAR', value: ticket.buyer || 'Titular' });
    pass.auxiliaryFields.push(
      { key: 'date', label: 'DATA E HORÁRIO', value: formatDate(event.date) },
      { key: 'ticket', label: 'INGRESSO', value: `#${ticket.identificationNumber}` }
    );
    pass.backFields.push(
      { key: 'venue', label: 'LOCAL', value: event.venue || 'Local a confirmar' },
      { key: 'type', label: 'INGRESSO', value: ticket.description || 'Ingresso' },
      { key: 'email', label: 'EMAIL DO TITULAR', value: ticket.buyerEmail || '' },
      { key: 'seat', label: 'ASSENTO / MESA', value: [ticket.location, ticket.table ? `Mesa ${ticket.table}` : ''].filter(Boolean).join(' · ') || 'Livre' }
    );
    pass.setBarcodes({ format: 'PKBarcodeFormatQR', message: ticket.qrCodeValue, messageEncoding: 'iso-8859-1', altText: `Ingresso #${ticket.identificationNumber}` });
    return pass.getAsBuffer();
  }
}

module.exports = new TicketWalletService();
