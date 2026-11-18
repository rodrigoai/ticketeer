const fetch = require('node-fetch');

const normalizeNovaTenant = (tenant) => {
  if (!tenant) return '';
  let cleaned = String(tenant).trim();
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  cleaned = cleaned.replace(/\/.*$/, '');
  cleaned = cleaned.replace(/\.?pay\.nova\.money$/i, '');
  cleaned = cleaned.replace(/\.$/, '');
  return cleaned;
};

class NovaMoneyService {
  normalizeTenant(tenant) {
    return normalizeNovaTenant(tenant);
  }

  async findPaidCartOrder({ tenant, apiKey, cartPageId, purchaseId }) {
    const normalizedTenant = normalizeNovaTenant(tenant);
    if (!normalizedTenant || !apiKey || !cartPageId || !purchaseId) {
      throw new Error('Nova.Money cart configuration is incomplete');
    }
    const url = new URL(`https://${normalizedTenant}.pay.nova.money/api/v1/orders`);
    url.searchParams.append('cart_page_uuids[]', cartPageId);
    url.searchParams.append('meta[]', `purchaseId.${purchaseId}`);
    url.searchParams.append('status[]', 'paid');
    url.searchParams.set('limit', '2');
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}`, 'X-Api-Key': apiKey },
      timeout: 15000
    });
    if (!response.ok) throw new Error('Unable to verify payment with NovaPay. Please try again.');
    const data = await response.json();
    const orders = data?.data;
    if (!Array.isArray(orders)) throw new Error('Invalid NovaPay order response');
    if (orders.length !== 1 || orders[0].status !== 'paid' || orders[0].meta?.purchaseId !== purchaseId) {
      throw new Error('A confirmed payment was not found for this purchase. Please try again.');
    }
    return orders[0];
  }

  async createCart({ tenant, apiKey, cartPaymentServiceId, payload }) {
    const normalizedTenant = normalizeNovaTenant(tenant);

    if (!normalizedTenant || !apiKey || !cartPaymentServiceId) {
      throw new Error('Nova.Money cart configuration is incomplete');
    }

    const response = await fetch(
      `https://${normalizedTenant}.pay.nova.money/api/v1/carts/${cartPaymentServiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-Api-Key': apiKey
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data?.message || data?.error || 'Nova.Money cart creation failed';
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }
}

module.exports = new NovaMoneyService();
