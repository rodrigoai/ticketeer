const express = require('express');
const cartPurchaseService = require('../services/cartPurchaseService');
const pdfService = require('../services/ticketPdfService');
const walletService = require('../services/ticketWalletService');

module.exports = function createPurchaseTicketRoutes() {
  const router = express.Router();
  router.get('/events/:hash/purchases/:purchaseId/tickets/:ticketId/:format', async (req, res) => {
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
  return router;
};
