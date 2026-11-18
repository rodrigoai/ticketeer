const prisma = require('../config/prisma');
const novaMoneyService = require('./novaMoneyService');
const userProfileService = require('./userProfileService');
const ticketService = require('./ticketService');
const orderService = require('./orderService');
const qrCodeService = require('./qrCodeService');

class CartPurchaseService {
  async create({ event, reservation, customer }) {
    const purchase = await prisma.cartPurchase.create({
      data: {
        eventId: event.id,
        reservationKey: reservation.reservationKey,
        ticketIds: reservation.tickets.map(ticket => ticket.id),
        customer,
        cartPageId: event.cart_payment_service_id
      }
    });
    const baseUrl = process.env.BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://ticketeer.vercel.app');
    const redirectUrl = new URL(`/event/${encodeURIComponent(event.public_hash)}/success/${purchase.id}`, baseUrl);
    return { purchaseId: purchase.id, redirect_url: redirectUrl.toString() };
  }

  async confirm(eventHash, purchaseId) {
    if (!/^[0-9a-f-]{36}$/i.test(purchaseId || '')) throw new Error('Invalid purchase link');
    let purchase = await prisma.cartPurchase.findFirst({
      where: { id: purchaseId, event: { public_hash: eventHash } },
      include: { event: true }
    });
    if (!purchase) throw new Error('Purchase not found');

    // The redirect is the primary path. Read NovaPay directly, without waiting for a webhook.
    if (!purchase.orderId) {
      const profile = await userProfileService.getProfileByUserId(purchase.event.created_by);
      const order = await novaMoneyService.findPaidCartOrder({
        tenant: profile?.nova_money_tenant,
        apiKey: profile?.nova_money_api_key,
        cartPageId: purchase.cartPageId,
        purchaseId
      });
      const meta = order.meta || {};
      const expectedIds = [...purchase.ticketIds].sort((a, b) => a - b);
      if (meta.userId !== purchase.event.created_by || Number(meta.eventId) !== purchase.eventId ||
          JSON.stringify([...(meta.ticketIds || [])].sort((a, b) => a - b)) !== JSON.stringify(expectedIds)) {
        throw new Error('Payment does not match this purchase');
      }
      await ticketService.processShoppingCartWebhook({ event: 'order.paid', payload: order }, purchase.event.created_by);
      purchase = await prisma.cartPurchase.findUnique({ where: { id: purchaseId }, include: { event: true } });
    }

    const hash = require('../utils/orderHash').generateHash(`${purchase.orderId}:${purchase.eventId}`);
    const order = await orderService.getOrderByHash(hash);
    const tickets = await prisma.ticket.findMany({
      where: { eventId: purchase.eventId, order: purchase.orderId, id: { in: purchase.ticketIds } },
      orderBy: { identificationNumber: 'asc' }
    });
    if (tickets.length !== purchase.ticketIds.length) throw new Error('Purchase tickets could not be found');
    const showTickets = tickets.length === 1 || order.isCompleted;
    const receiptTickets = showTickets ? await Promise.all(tickets.map(async ticket => ({
      identificationNumber: ticket.identificationNumber,
      description: ticket.description,
      location: ticket.location,
      table: ticket.table,
      qrCode: (await qrCodeService.generateQrCodeDataUrl(ticket, purchase.event.created_by)).dataUrl
    }))) : [];
    return {
      event: order.event,
      confirmationHash: hash,
      totalTickets: tickets.length,
      isCompleted: order.isCompleted,
      emailSent: purchase.emailSent,
      qrEmailSent: purchase.qrEmailSent,
      tickets: receiptTickets
    };
  }
}

module.exports = new CartPurchaseService();
