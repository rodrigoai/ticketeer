const express = require('express');
const cartPurchaseService = require('../services/cartPurchaseService');
const pdfService = require('../services/ticketPdfService');
const qrCodeService = require('../services/qrCodeService');
const ticketService = require('../services/ticketService');
const walletService = require('../services/ticketWalletService');

module.exports = function createPurchaseTicketRoutes({ requiresAuth }) {
  const router = express.Router();
  router.get('/public/events/:hash/purchases/:purchaseId/tickets/:ticketId/:format', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'no-referrer');
    try {
      const { hash, purchaseId, ticketId, format } = req.params;
      if (!['pdf', 'apple', 'google'].includes(format)) return res.status(404).json({ message: 'Format not found' });
      const purchase = await cartPurchaseService.confirm(hash, purchaseId, { allowConfirmation: false });
      const ticket = purchase.tickets.find(ticket => String(ticket.id) === ticketId);
      if (!ticket) return res.status(404).json({ message: 'Ticket not found or owners not confirmed' });
      const event = { ...purchase.event, publicHash: hash };
      if (format === 'google') {
        if (!walletService.getCapabilities().google) return res.status(503).json({ message: 'Google Wallet is not configured' });
        return res.redirect(302, walletService.google(event, ticket));
      }
      if (format === 'apple' && !walletService.getCapabilities().apple) return res.status(503).json({ message: 'Apple Wallet is not configured' });
      const buffer = format === 'pdf' ? await pdfService.generate(event, ticket) : walletService.apple(event, ticket);
      const extension = format === 'pdf' ? 'pdf' : 'pkpass';
      res.set('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.apple.pkpass');
      res.set('Content-Disposition', `attachment; filename="ingresso-${ticket.identificationNumber}.${extension}"`);
      return res.send(buffer);
    } catch (error) {
      console.error('Ticket export failed:', error.message);
      return res.status(400).json({ message: 'Não foi possível salvar o ingresso. Volte à página da compra e tente novamente.' });
    }
  });

  router.get('/tickets/:id/printable', requiresAuth, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'no-referrer');
    try {
      const userId = req.auth.payload?.sub || req.auth.sub;
      const ticket = await ticketService.getTicketById(req.params.id, userId);
      if (!ticket.order) return res.status(400).json({ message: 'Only sold tickets can be printed' });

      const qr = await qrCodeService.generateQrCodeDataUrl(ticket, userId);
      const event = {
        name: ticket.event.name,
        venue: ticket.event.venue,
        date: ticket.event.opening_datetime,
        eventImageUrl: ticket.event.event_image_url,
        mobileEventImageUrl: ticket.event.mobile_event_image_url
      };
      const buffer = await pdfService.generate(event, { ...ticket, qrCode: qr.dataUrl });

      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', `inline; filename="ingresso-${ticket.identificationNumber}.pdf"`);
      return res.send(buffer);
    } catch (error) {
      if (/ticket not found|access denied/i.test(error.message)) {
        return res.status(404).json({ message: 'Ticket not found or you do not have access to it' });
      }
      console.error('Error generating printable ticket:', error);
      return res.status(500).json({ message: 'Could not prepare the ticket. Try again.' });
    }
  });
  return router;
};
