export const formatPhoneMask = (value = '') => {
  const digits = String(value).replace(/\D/g, '').slice(0, 11)

  if (digits.length <= 2) return digits ? `(${digits}` : ''
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export const normalizePhoneDigits = (value = '') => String(value).replace(/\D/g, '').slice(0, 11)

export const isValidEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())

export const isCustomerInfoValid = (customer) => {
  return (
    String(customer?.name || '').trim().length >= 2 &&
    isValidEmail(customer?.email || '') &&
    normalizePhoneDigits(customer?.phone || '').length === 11
  )
}

export const sumCartTickets = (tickets) => {
  return tickets.reduce((total, ticket) => total + (Number(ticket.price) || 0), 0)
}
