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
