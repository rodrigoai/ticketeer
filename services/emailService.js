const { SESClient, SendEmailCommand, SendRawEmailCommand } = require('@aws-sdk/client-ses');
const qrCodeService = require('./qrCodeService');
const { DEFAULT_APP_TIME_ZONE } = require('../utils/dateTime');

function formatEventDateTimeForEmail(value, options = {}) {
  if (!value) return options.fallback || 'A definir';

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return options.fallback || 'A definir';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: process.env.APP_TIMEZONE || DEFAULT_APP_TIME_ZONE,
    weekday: options.weekday,
    year: 'numeric',
    month: options.month || '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

class EmailService {
  constructor() {
    // Initialize AWS SES client
    this.sesClient = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    });
    
    this.fromEmail = process.env.FROM_EMAIL || 'no-reply@nova.money';
  }

  /**
   * Send confirmation email with buyer confirmation link
   * @param {string} toEmail - Customer email address
   * @param {Object} emailData - Email template data
   * @returns {Promise} - Send result
   */
  async sendConfirmationEmail(toEmail, emailData) {
    try {
      const { eventName, confirmationUrl, orderId, totalTickets } = emailData;

      const subject = `Confirme as informações dos seus ingressos - ${eventName}`;
      
      const htmlBody = this.generateConfirmationEmailTemplate({
        eventName,
        confirmationUrl,
        orderId,
        totalTickets
      });

      const textBody = `
Olá!

Você acabou de comprar ${totalTickets} ingresso(s) para o evento ${eventName}.

Para finalizar sua compra, confirme as informações dos portadores dos ingressos acessando o link abaixo:

${confirmationUrl}

Pedido: ${orderId}

Atenciosamente,
Equipe Nova Money
      `.trim();

      const command = new SendEmailCommand({
        Source: this.fromEmail,
        Destination: {
          ToAddresses: [toEmail],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8',
            },
            Text: {
              Data: textBody,
              Charset: 'UTF-8',
            },
          },
        },
      });

      const result = await this.sesClient.send(command);
      console.log('Confirmation email sent successfully:', result.MessageId);
      
      return {
        success: true,
        messageId: result.MessageId,
        email: toEmail
      };

    } catch (error) {
      console.error('Error sending confirmation email:', error);
      throw new Error(`Failed to send confirmation email: ${error.message}`);
    }
  }

  /**
   * Generate HTML email template for buyer confirmation
   * @param {Object} data - Template data
   * @returns {string} - HTML email content
   */
  generateConfirmationEmailTemplate({ eventName, confirmationUrl, orderId, totalTickets }) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirme suas informações</title>
    <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; background: #f3f4f6; }
        .container { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
        .header { background: #4338ca; color: #ffffff; padding: 34px 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 28px; line-height: 1.2; }
        .header p { margin: 10px 0 0; color: #e0e7ff; font-size: 16px; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #d1d5db; border-top: 0; }
        .footer { background: #111827; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; color: #d1d5db; font-size: 14px; }
        .summary-box { background: #eef2ff; border: 2px solid #4338ca; padding: 22px; border-radius: 10px; margin: 24px 0; }
        .summary-label { margin: 0 0 4px; color: #4338ca; font-size: 12px; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; }
        .summary-title { margin: 0 0 16px; color: #111827; font-size: 24px; line-height: 1.25; }
        .summary-row { margin: 8px 0; color: #374151; font-size: 16px; }
        .summary-value { color: #111827; font-weight: bold; }
        .cta-wrap { text-align: center; margin: 30px 0 26px; }
        .warning { background: #fffbeb; border: 1px solid #f59e0b; color: #78350f; padding: 16px; border-radius: 8px; margin: 24px 0; }
        .fallback-link { word-break: break-all; background: #f9fafb; border: 1px solid #e5e7eb; color: #374151; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 Confirme suas informações</h1>
            <p>Seus ingressos estão quase prontos!</p>
        </div>
        
        <div class="content">
            <h2>Olá!</h2>
            
            <p>Você acabou de comprar ingressos e precisa confirmar os dados dos portadores para finalizar a emissão.</p>

            <div class="summary-box">
                <p class="summary-label">Evento</p>
                <h3 class="summary-title">📅 ${eventName}</h3>
                <p class="summary-row"><span>Pedido:</span> <span class="summary-value">${orderId}</span></p>
                <p class="summary-row"><span>Ingressos:</span> <span class="summary-value">${totalTickets}</span></p>
            </div>
            
            <p>Use o botão abaixo para informar os dados de cada portador:</p>
            
            <div class="cta-wrap">
                <a href="${confirmationUrl}" style="display: inline-block; background: #111827; color: #ffffff !important; padding: 16px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; border: 2px solid #111827;">
                    ✅ Confirmar informações
                </a>
            </div>
            
            <div class="warning">
                <strong>⚠️ Importante:</strong> Este link é único e pessoal. Após preencher as informações, não será possível alterá-las.
            </div>
            
            <p>Se você não conseguir clicar no botão acima, copie e cole este link no seu navegador:</p>
            <p class="fallback-link">
                ${confirmationUrl}
            </p>
        </div>
        
        <div class="footer">
            <p>Este e-mail foi enviado automaticamente pelo sistema de ingressos Nova Money.</p>
            <p>Se você não fez esta compra, pode ignorar este e-mail.</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Send order completion notification email
   * @param {string} toEmail - Customer email address
   * @param {Object} emailData - Email template data
   * @returns {Promise} - Send result
   */
  async sendOrderCompletionEmail(toEmail, emailData) {
    try {
      const { eventName, orderId, totalTickets, tickets } = emailData;

      const subject = `Compra confirmada - ${eventName}`;
      
      const htmlBody = this.generateCompletionEmailTemplate({
        eventName,
        orderId,
        totalTickets,
        tickets
      });

      const textBody = `
Compra confirmada!

Suas informações foram registradas com sucesso para o evento ${eventName}.

Pedido: ${orderId}
Total de ingressos: ${totalTickets}

Seus ingressos estão prontos! Guarde este e-mail como comprovante.

Atenciosamente,
Equipe Nova Money
      `.trim();

      const command = new SendEmailCommand({
        Source: this.fromEmail,
        Destination: {
          ToAddresses: [toEmail],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8',
            },
            Text: {
              Data: textBody,
              Charset: 'UTF-8',
            },
          },
        },
      });

      const result = await this.sesClient.send(command);
      console.log('Order completion email sent successfully:', result.MessageId);
      
      return {
        success: true,
        messageId: result.MessageId,
        email: toEmail
      };

    } catch (error) {
      console.error('Error sending completion email:', error);
      throw new Error(`Failed to send completion email: ${error.message}`);
    }
  }

  /**
   * Generate HTML email template for order completion
   * @param {Object} data - Template data
   * @returns {string} - HTML email content
   */
  generateCompletionEmailTemplate({ eventName, orderId, totalTickets, tickets }) {
    const ticketsList = tickets.map(ticket => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">#${ticket.identificationNumber}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${ticket.buyer || 'N/A'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${ticket.description}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compra confirmada</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; color: #666; font-size: 14px; }
        .success-box { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; }
        .info-box { background: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .ticket-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .ticket-table th { background: #007bff; color: white; padding: 12px; text-align: left; }
        .ticket-table td { padding: 10px; border-bottom: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Compra confirmada!</h1>
            <p>Suas informações foram registradas com sucesso</p>
        </div>
        
        <div class="content">
            <div class="success-box">
                <h2>✅ Tudo pronto!</h2>
                <p>Suas informações foram confirmadas e seus ingressos estão válidos.</p>
            </div>
            
            <div class="info-box">
                <h3>📅 ${eventName}</h3>
                <p><strong>Pedido:</strong> ${orderId}</p>
                <p><strong>Total de ingressos:</strong> ${totalTickets}</p>
            </div>
            
            <h3>🎫 Seus ingressos:</h3>
            <table class="ticket-table">
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Portador</th>
                        <th>Descrição</th>
                    </tr>
                </thead>
                <tbody>
                    ${ticketsList}
                </tbody>
            </table>
            
            <div class="info-box">
                <p><strong>💡 Importante:</strong> Guarde este e-mail como comprovante da sua compra. Apresente um documento de identificação na entrada do evento.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>Obrigado por usar o sistema de ingressos Nova Money!</p>
            <p>Em caso de dúvidas, entre em contato conosco.</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Send QR code ticket email to buyer
   * @param {string} toEmail - Buyer's email address
   * @param {Object} ticketData - Ticket information
   * @param {Object} eventData - Event information
   * @param {string} userId - User ID (event owner)
   * @returns {Promise} - Send result
   */
  async sendTicketQrCodeEmail(toEmail, ticketData, eventData, userId) {
    try {
      console.log(`Sending QR code email to ${toEmail} for ticket ${ticketData.id}`);
      
      // Generate QR code for the ticket
      const qrCodeData = await qrCodeService.generateQrCodeForTicket(ticketData, userId);
      const qrCodeDataUrl = await qrCodeService.generateQrCodeDataUrl(ticketData, userId);
      
      const subject = `Seu ingresso QR Code - ${eventData.name}`;
      
      // Create multipart email with embedded QR code and attachment
      const boundary = 'ticketeer_qr_boundary_' + Date.now();
      
      const htmlBody = this.generateQrCodeEmailTemplate({
        eventName: eventData.name,
        eventVenue: eventData.venue,
        eventDate: eventData.date,
        ticketNumber: ticketData.identificationNumber,
        buyerName: ticketData.buyer,
        qrCodeDataUrl: qrCodeDataUrl.dataUrl,
        qrCodeHash: qrCodeData.hash
      });

      const textBody = `
Seu ingresso para ${eventData.name}

Ingresso #${ticketData.identificationNumber}
Portador: ${ticketData.buyer}
Evento: ${eventData.name}
Local: ${eventData.venue || 'A definir'}
Data: ${formatEventDateTimeForEmail(eventData.date)}

Código QR: ${qrCodeData.hash}

Apresente este QR code na entrada do evento.

Atenciosamente,
Equipe Nova Money
      `.trim();

      // Create raw email with attachment
      const rawEmail = [
        `From: ${this.fromEmail}`,
        `To: ${toEmail}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: multipart/alternative; boundary="alt_boundary"',
        '',
        '--alt_boundary',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        textBody,
        '',
        '--alt_boundary',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        htmlBody,
        '',
        '--alt_boundary--',
        '',
        `--${boundary}`,
        'Content-Type: image/png',
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="ticket-${ticketData.identificationNumber}-qr.png"`,
        '',
        qrCodeData.buffer.toString('base64'),
        '',
        `--${boundary}--`
      ].join('\r\n');

      const command = new SendRawEmailCommand({
        RawMessage: {
          Data: rawEmail
        }
      });

      const result = await this.sesClient.send(command);
      console.log(`QR code email sent successfully to ${toEmail}:`, result.MessageId);
      
      return {
        success: true,
        messageId: result.MessageId,
        email: toEmail,
        ticketId: ticketData.id,
        qrHash: qrCodeData.hash
      };

    } catch (error) {
      console.error(`Error sending QR code email to ${toEmail}:`, error);
      throw new Error(`Failed to send QR code email: ${error.message}`);
    }
  }

  /**
   * Send QR code emails for multiple tickets
   * @param {Array} ticketsData - Array of ticket objects with buyer info
   * @param {Object} eventData - Event information
   * @param {string} userId - User ID (event owner)
   * @returns {Promise<Array>} - Array of send results
   */
  async sendQrCodeEmailsForTickets(ticketsData, eventData, userId) {
    const results = [];
    const errors = [];

    for (const ticket of ticketsData) {
      try {
        if (ticket.buyerEmail) {
          const result = await this.sendTicketQrCodeEmail(
            ticket.buyerEmail, 
            ticket, 
            eventData, 
            userId
          );
          results.push(result);
          
          // Add delay between emails to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          console.warn(`No email found for ticket ${ticket.id}, skipping QR code email`);
        }
      } catch (error) {
        console.error(`Failed to send QR code email for ticket ${ticket.id}:`, error);
        errors.push({
          ticketId: ticket.id,
          email: ticket.buyerEmail,
          error: error.message
        });
      }
    }

    return {
      successful: results,
      failed: errors,
      totalSent: results.length,
      totalFailed: errors.length
    };
  }

  /**
   * Generate HTML email template for QR code ticket
   * @param {Object} data - Template data
   * @returns {string} - HTML email content
   */
  generateQrCodeEmailTemplate({ eventName, eventVenue, eventDate, ticketNumber, buyerName, qrCodeDataUrl, qrCodeHash }) {
    const formattedDate = formatEventDateTimeForEmail(eventDate, {
      fallback: 'Data a definir',
      weekday: 'long',
      month: 'long'
    });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Seu Ingresso QR Code</title>
    <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; background: #f3f4f6; }
        .container { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
        .header { background: #047857; color: #ffffff; padding: 34px 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 28px; line-height: 1.2; }
        .header p { margin: 10px 0 0; color: #d1fae5; font-size: 16px; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #d1d5db; border-top: 0; }
        .footer { background: #111827; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; color: #d1d5db; font-size: 14px; }
        .ticket-info { background: #ecfdf5; border: 2px solid #047857; padding: 22px; border-radius: 10px; margin: 24px 0; }
        .summary-label { margin: 0 0 4px; color: #047857; font-size: 12px; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; }
        .summary-title { margin: 0 0 16px; color: #111827; font-size: 24px; line-height: 1.25; }
        .summary-row { margin: 8px 0; color: #374151; font-size: 16px; }
        .summary-value { color: #111827; font-weight: bold; }
        .qr-section { background: #ffffff; border: 3px solid #111827; padding: 26px; border-radius: 12px; text-align: center; margin: 28px 0; }
        .qr-section h3 { margin: 0; color: #111827; font-size: 22px; }
        .qr-section p { color: #374151; }
        .qr-code { max-width: 280px; width: 100%; height: auto; margin: 18px 0; border: 1px solid #e5e7eb; border-radius: 8px; }
        .important { background: #fffbeb; border: 1px solid #f59e0b; color: #78350f; padding: 16px; border-radius: 8px; margin: 24px 0; }
        .hash-code { font-family: monospace; background: #f9fafb; border: 1px solid #e5e7eb; color: #374151; padding: 12px; border-radius: 8px; word-break: break-all; }
        .ticket-number { font-size: 26px; font-weight: bold; color: #047857; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 Seu Ingresso Digital</h1>
            <p>QR Code de Acesso</p>
        </div>
        
        <div class="content">
            <h2>Olá, ${buyerName}!</h2>
            
            <p>Seu ingresso foi confirmado com sucesso. Apresente o QR Code abaixo na entrada do evento.</p>
            
            <div class="ticket-info">
                <p class="summary-label">Ingresso</p>
                <h3 class="summary-title">📅 ${eventName}</h3>
                <p class="summary-row"><span>Número:</span> <span class="ticket-number">#${ticketNumber}</span></p>
                <p class="summary-row"><span>Portador:</span> <span class="summary-value">${buyerName}</span></p>
                <p class="summary-row"><span>Local:</span> <span class="summary-value">${eventVenue || 'A definir'}</span></p>
                <p class="summary-row"><span>Data:</span> <span class="summary-value">${formattedDate}</span></p>
            </div>
            
            <div class="qr-section">
                <h3>🔲 Código QR de Acesso</h3>
                <p>Apresente este código na entrada:</p>
                <img src="${qrCodeDataUrl}" alt="QR Code do Ingresso" class="qr-code" />
                <div class="hash-code">
                    <small>Hash: ${qrCodeHash}</small>
                </div>
            </div>
            
            <div class="important">
                <strong>📱 Instruções importantes:</strong>
                <ul>
                    <li>Salve este e-mail ou imprima o QR Code</li>
                    <li>Apresente um documento de identificação na entrada</li>
                    <li>O QR Code também está anexado como imagem neste e-mail</li>
                    <li>Chegue com antecedência ao evento</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p>Obrigado por usar o sistema de ingressos Nova Money!</p>
            <p>Este e-mail foi enviado automaticamente. Guarde-o como comprovante.</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }
}

module.exports = new EmailService();
