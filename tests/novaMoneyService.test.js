jest.mock('node-fetch', () => jest.fn());
const fetch = require('node-fetch');
const service = require('../services/novaMoneyService');
const args = { tenant: 'tenant', apiKey: 'secret', cartPageId: 'page', purchaseId: 'purchase' };
beforeEach(() => jest.resetAllMocks());

test('looks up exactly one paid order by purchase metadata and cart page using backend credentials', async () => {
  const order = { id: 1, status: 'paid', meta: { purchaseId: 'purchase' } };
  fetch.mockResolvedValue({ ok: true, json: async () => ({ data: [order] }) });
  expect(await service.findPaidCartOrder(args)).toEqual(order);
  const [url, options] = fetch.mock.calls[0];
  expect(new URL(url).searchParams.get('meta[]')).toBe('purchaseId.purchase');
  expect(new URL(url).searchParams.get('cart_page_uuids[]')).toBe('page');
  expect(new URL(url).searchParams.get('status[]')).toBe('paid');
  expect(options.headers.Authorization).toBe('Bearer secret');
});

test.each([
  [],
  [{ status: 'waiting_payment', meta: { purchaseId: 'purchase' } }],
  [{ status: 'paid', meta: { purchaseId: 'different-purchase' } }],
  [{ status: 'paid', meta: { purchaseId: 'purchase' } }, { status: 'paid', meta: { purchaseId: 'purchase' } }]
])('rejects absent, unpaid, mismatched or ambiguous orders (%j)', async (...orders) => {
  // Each table entry is itself the provider's list of orders.
  fetch.mockResolvedValue({ ok: true, json: async () => ({ data: orders }) });
  await expect(service.findPaidCartOrder(args)).rejects.toThrow('confirmed payment was not found');
});

test('handles provider failures without confirming', async () => {
  fetch.mockResolvedValue({ ok: false });
  await expect(service.findPaidCartOrder(args)).rejects.toThrow('Unable to verify payment');
});
