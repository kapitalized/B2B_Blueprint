/**
 * Shared currency options for admin (coupons, subscription plans). Keep in sync.
 */
export const CURRENCY_OPTIONS = [
  { value: 'usd', label: 'USD' },
  { value: 'eur', label: 'EUR' },
  { value: 'gbp', label: 'GBP' },
  { value: 'aud', label: 'AUD' },
  { value: 'cad', label: 'CAD' },
] as const;

export type AdminCurrency = (typeof CURRENCY_OPTIONS)[number]['value'];
