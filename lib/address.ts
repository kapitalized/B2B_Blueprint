/**
 * Structured address: line 1, line 2, postcode, state/province, country.
 * Country dropdown uses COUNTRIES everywhere for consistency.
 */

export interface Address {
  line1: string;
  line2: string;
  postcode: string;
  stateProvince: string;
  country: string;
}

export const EMPTY_ADDRESS: Address = {
  line1: '',
  line2: '',
  postcode: '',
  stateProvince: '',
  country: '',
};

/** Format address as: line1, line2, postcode, state/province, country */
export function formatAddress(addr: Address | null | undefined): string {
  if (!addr) return '';
  const parts = [
    addr.line1?.trim(),
    addr.line2?.trim(),
    [addr.postcode?.trim(), addr.stateProvince?.trim()].filter(Boolean).join(', '),
    addr.country?.trim(),
  ].filter(Boolean);
  return parts.join('\n');
}

/** Parse legacy single-line or multiline address into Address (best effort). */
export function parseAddress(raw: string | null | undefined): Address {
  if (!raw || !raw.trim()) return { ...EMPTY_ADDRESS };
  const lines = raw.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { ...EMPTY_ADDRESS };
  const last = lines[lines.length - 1];
  const comma = last.lastIndexOf(',');
  const country = comma >= 0 ? last.slice(comma + 1).trim() : last;
  const rest = comma >= 0 ? last.slice(0, comma).trim() : '';
  const [postcode, ...stateParts] = rest ? rest.split(',').map((s) => s.trim()).reverse() : [];
  const stateProvince = stateParts.reverse().join(', ') || '';
  return {
    line1: lines[0] ?? '',
    line2: lines[1] ?? '',
    postcode: postcode ?? '',
    stateProvince,
    country: country || '',
  };
}

/** All countries for address dropdown (alphabetical). */
export const COUNTRIES: string[] = [
  '',
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
  'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia',
  'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Ivory Coast',
  'Jamaica', 'Japan', 'Jordan',
  'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Macedonia', 'Norway',
  'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar',
  'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan',
  'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
  'Yemen', 'Zambia', 'Zimbabwe',
];
