const PDFDocument = require('pdfkit');
const { DEFAULT_APP_TIME_ZONE } = require('../utils/dateTime');
const loadTicketCover = require('./ticketCoverImage');

const colors = {
  text: '#0f172a',
  muted: '#697386',
  border: '#e8eaf2',
  divider: '#c6cde5',
  blue: '#3346cf',
  category: '#5261c4'
};

const formatter = options => new Intl.DateTimeFormat('pt-BR', { timeZone: DEFAULT_APP_TIME_ZONE, ...options });
const fullDate = formatter({ dateStyle: 'long', timeStyle: 'short' });
const shortDate = formatter({ day: '2-digit', month: 'short', year: 'numeric' });
const shortTime = formatter({ hour: '2-digit', minute: '2-digit' });
const validDate = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value) : null;

const formatDate = value => {
  const date = validDate(value);
  return date ? fullDate.format(date) : 'Data a confirmar';
};

function renderTicket(doc, event, ticket, artwork) {
  const cardWidth = 440;
  const cardTop = 34;
  const cardLeft = (doc.page.width - cardWidth) / 2;
  const cardRight = cardLeft + cardWidth;
  const left = cardLeft + 30;
  const right = cardRight - 30;
  const contentWidth = right - left;

  const text = (value, x, y, {
    width = contentWidth, size = 11, color = colors.text, bold = false,
    align = 'left', height = 32, characterSpacing = 0
  } = {}) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(color);
    const options = { width, height, align, characterSpacing, ellipsis: true };
    const usedHeight = Math.min(doc.heightOfString(value, options), height);
    doc.text(value, x, y, options);
    return usedHeight;
  };
  const field = (label, value, x, y, width, align, note) => {
    const valueTop = y + text(label, x, y, { width, align, color: colors.muted }) + 4;
    const afterValue = valueTop + text(value, x, valueTop, { width, align, bold: true, size: 12 });
    return note
      ? afterValue + 2 + text(note, x, afterValue + 2, { width, align, size: 9, color: colors.muted })
      : afterValue;
  };

  const coverLeft = cardLeft + 10;
  const coverTop = cardTop + 10;
  const coverWidth = cardWidth - 20;
  const coverHeight = 155;
  doc.roundedRect(coverLeft, coverTop, coverWidth, coverHeight, 18).fill(colors.blue);
  let cover;
  if (artwork) {
    try {
      const image = doc.openImage(artwork);
      if (image.width * image.height <= 4_000_000) cover = image;
    } catch {
      // Invalid artwork uses the same branded fallback as a missing cover.
    }
  }
  if (cover) {
    doc.save().roundedRect(coverLeft, coverTop, coverWidth, coverHeight, 18).clip();
    doc.image(cover, coverLeft, coverTop, { cover: [coverWidth, coverHeight], align: 'center', valign: 'center' });
    doc.restore();
  } else {
    const centered = { width: coverWidth, align: 'center', color: '#ffffff' };
    text('ticketeer', coverLeft, coverTop + 52, { ...centered, size: 34, bold: true, height: 42 });
    text('seu próximo encontro', coverLeft, coverTop + 94, { ...centered, size: 10, characterSpacing: 1.25 });
  }

  let y = coverTop + coverHeight + 22;
  y += text((ticket.description || 'Ingresso').toUpperCase(), left, y, {
    size: 10, bold: true, color: colors.category, height: 24, characterSpacing: 0.6
  }) + 7;
  y += text(event.name, left, y, { size: 23, bold: true, height: 57 }) + 7;
  y += text(`Ingresso #${ticket.identificationNumber}`, left, y, { color: colors.muted });
  const upperPerforation = y + 16;

  const date = validDate(event.date);
  const rightWidth = 158;
  const leftWidth = contentWidth - rightWidth - 20;
  y = upperPerforation + 20;
  y = Math.max(
    field('Data', date ? shortDate.format(date) : 'A confirmar', left, y, leftWidth, 'left'),
    field('Horário', date ? shortTime.format(date) : 'A confirmar', right - rightWidth, y, rightWidth, 'right', 'Horário de Brasília')
  ) + 15;
  const seat = [ticket.location, ticket.table ? `Mesa ${ticket.table}` : ''].filter(Boolean).join(' · ');
  y = Math.max(
    field('Local', event.venue || 'A confirmar', left, y, leftWidth, 'left'),
    field('Assento / mesa', seat || 'Livre', right - rightWidth, y, rightWidth, 'right')
  ) + 16;

  doc.moveTo(left, y).lineTo(right, y).lineWidth(1).stroke('#f0f1f5');
  y += 14;
  doc.circle(left + 9, y + 6, 3.3).lineWidth(1.25).stroke('#7c86a8');
  doc.moveTo(left + 2, y + 20).bezierCurveTo(left + 2, y + 10, left + 16, y + 10, left + 16, y + 20).stroke();
  const ownerX = left + 28;
  const ownerWidth = contentWidth - 28;
  y += text('Titular do ingresso', ownerX, y, { width: ownerWidth, size: 10, color: colors.muted }) + 4;
  y += text(ticket.buyer || 'Titular a confirmar', ownerX, y, { width: ownerWidth, size: 13, bold: true }) + 4;
  y += text(`Email de envio: ${ticket.buyerEmail || 'Email não informado'}`, ownerX, y, { width: ownerWidth, color: colors.muted });
  const lowerPerforation = y + 17;

  const qrSize = 148;
  const qrTop = lowerPerforation + 16;
  doc.image(Buffer.from(ticket.qrCode.split(',')[1], 'base64'), (doc.page.width - qrSize) / 2, qrTop, { width: qrSize });
  y = qrTop + qrSize + 9;
  y += text('Seu acesso começa aqui.', left, y, { align: 'center', bold: true }) + 5;
  y += text('Apresente este QR code na entrada do evento.', left, y, { align: 'center', size: 10, color: colors.muted });

  doc.roundedRect(cardLeft, cardTop, cardWidth, y + 22 - cardTop, 24).lineWidth(1).stroke(colors.border);
  for (const perforation of [upperPerforation, lowerPerforation]) {
    doc.moveTo(cardLeft + 21, perforation).lineTo(cardRight - 21, perforation)
      .lineWidth(1).dash(3, { space: 4 }).stroke(colors.divider).undash();
    for (const side of [cardLeft, cardRight]) {
      doc.circle(side, perforation, 10).fillAndStroke('#ffffff', colors.border);
      const outside = side === cardLeft ? side - 11 : side;
      doc.rect(outside, perforation - 11, 11, 22).fill('#ffffff');
    }
  }
}

module.exports = {
  formatDate,
  async generate(event, ticket) {
    const artwork = await loadTicketCover(event);
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 32,
        info: { Title: `${event.name} - Ingresso ${ticket.identificationNumber}`, Author: 'Ticketeer' }
      });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      try {
        renderTicket(doc, event, ticket, artwork);
        doc.end();
      } catch (error) {
        doc.destroy();
        reject(error);
      }
    });
  }
};
