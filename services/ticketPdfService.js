const PDFDocument = require('pdfkit');
const { DEFAULT_APP_TIME_ZONE } = require('../utils/dateTime');

const formatDate = value => value && !Number.isNaN(new Date(value).getTime())
  ? new Intl.DateTimeFormat('pt-BR', { timeZone: DEFAULT_APP_TIME_ZONE, dateStyle: 'long', timeStyle: 'short' }).format(new Date(value))
  : 'Data a confirmar';

module.exports = {
  formatDate,
  generate(event, ticket) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `${event.name} - Ingresso ${ticket.identificationNumber}`, Author: 'Ticketeer' } });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      try {
        doc.roundedRect(48, 42, 499, 750, 22).fill('#ffffff').stroke('#e2e8f0');
        doc.roundedRect(48, 42, 499, 74, 22).fill('#3346cf');
        doc.rect(48, 90, 499, 26).fill('#3346cf');
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20).text('ticketeer', 74, 67);
        doc.font('Helvetica').fontSize(10).text('INGRESSO CONFIRMADO', 320, 74, { width: 200, align: 'right' });
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(23).text(event.name, 74, 142, { width: 447, height: 82, ellipsis: true });
        doc.fontSize(12).font('Helvetica').fillColor('#475569').text(ticket.description || 'Ingresso', 74, 230, { width: 447, height: 36, ellipsis: true });
        doc.moveTo(74, 284).lineTo(521, 284).dash(3, { space: 4 }).strokeColor('#cbd5e1').stroke().undash();
        const field = (label, value, x, y, width = 447) => {
          doc.fillColor('#64748b').font('Helvetica').fontSize(9).text(label, x, y, { width });
          const content = value || 'A confirmar';
          let size = 12;
          doc.font('Helvetica-Bold').fontSize(size);
          while (size > 8 && doc.heightOfString(content, { width }) > 40) doc.fontSize(--size);
          doc.fillColor('#0f172a').text(content, x, y + 17, { width, height: 40, ellipsis: true });
        };
        field('DATA E HORÁRIO', formatDate(event.date), 74, 306);
        field('LOCAL', event.venue || 'Local a confirmar', 74, 374, 287);
        field('ASSENTO / MESA', [ticket.location, ticket.table ? `Mesa ${ticket.table}` : ''].filter(Boolean).join(' · ') || 'Livre', 378, 374, 143);
        field('TITULAR', ticket.buyer, 74, 442);
        field('EMAIL DO TITULAR', ticket.buyerEmail, 74, 508);
        doc.moveTo(74, 574).lineTo(521, 574).dash(3, { space: 4 }).strokeColor('#cbd5e1').stroke().undash();
        doc.image(Buffer.from(ticket.qrCode.split(',')[1], 'base64'), 229, 592, { width: 136, height: 136 });
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#3346cf').text(`INGRESSO #${ticket.identificationNumber}`, 74, 741, { width: 447, align: 'center' });
        doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('Apresente este QR code na entrada. Válido para uma pessoa.', 74, 762, { width: 447, align: 'center' });
        doc.end();
      } catch (error) { doc.destroy(); reject(error); }
    });
  }
};
