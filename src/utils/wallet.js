export function getWalletPlatforms(device = {}, availability = {}) {
  const userAgent = device.userAgent || ''
  const isApple = /iPhone|iPad|iPod/i.test(userAgent) || (device.platform === 'MacIntel' && device.maxTouchPoints > 1)
  if (isApple) return availability.apple ? ['apple'] : []
  if (/Android/i.test(userAgent)) return availability.google ? ['google'] : []
  return ['apple', 'google'].filter(platform => availability[platform])
}
