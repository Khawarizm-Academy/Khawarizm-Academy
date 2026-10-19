import dialCodes from '@/shared/json/countryDialCodes.json';

/** One dialable country: identity, localized name, flag, and calling code. */
export interface Country {
  /** ISO 3166-1 alpha-2 code, e.g. "EG". */
  iso: string;
  /** Localized display name, e.g. "مصر". */
  name: string;
  /** E.164 prefix including the plus, e.g. "+20". */
  dial: string;
  /** Regional-indicator flag emoji. */
  flag: string;
}

const DIAL_CODES = dialCodes as Record<string, string>;

/** ISO2 -> its regional-indicator flag emoji (works without any image assets). */
function flagOf(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.codePointAt(0)!));
}

/** Arabic region names where the runtime supports it; falls back to the raw ISO code. */
const regionNames = ((): Intl.DisplayNames | null => {
  try {
    return new Intl.DisplayNames(['ar'], { type: 'region' });
  } catch {
    return null;
  }
})();

/** Every dialable country, sorted by its Arabic name. */
export const COUNTRIES: Country[] = Object.entries(DIAL_CODES)
  .map(([iso, dial]) => ({
    iso,
    name: regionNames?.of(iso) ?? iso,
    dial: `+${dial}`,
    flag: flagOf(iso),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

/** Country lookups keyed by ISO code for O(1) reads. */
const BY_ISO: Record<string, Country> = Object.fromEntries(COUNTRIES.map((c) => [c.iso, c]));

/** The country whose dial prefix a number starts with, preferring the longest match. */
const BY_DIAL_DESC = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

/**
 * Curated IANA timezone -> country map for local detection. The browser locale
 * region is often wrong (a Cairo user may run en-US), so the zone wins when known.
 */
const TIMEZONE_COUNTRY: Record<string, string> = {
  'Africa/Cairo': 'EG',
  'Africa/Casablanca': 'MA',
  'Africa/Algiers': 'DZ',
  'Africa/Tunis': 'TN',
  'Africa/Tripoli': 'LY',
  'Africa/Khartoum': 'SD',
  'Africa/Nairobi': 'KE',
  'Africa/Lagos': 'NG',
  'Africa/Accra': 'GH',
  'Africa/Johannesburg': 'ZA',
  'Africa/Addis_Ababa': 'ET',
  'Africa/Dakar': 'SN',
  'Africa/Abidjan': 'CI',
  'Africa/Amman': 'JO',
  'Asia/Riyadh': 'SA',
  'Asia/Dubai': 'AE',
  'Asia/Qatar': 'QA',
  'Asia/Kuwait': 'KW',
  'Asia/Bahrain': 'BH',
  'Asia/Muscat': 'OM',
  'Asia/Amman': 'JO',
  'Asia/Beirut': 'LB',
  'Asia/Damascus': 'SY',
  'Asia/Baghdad': 'IQ',
  'Asia/Gaza': 'PS',
  'Asia/Hebron': 'PS',
  'Asia/Aden': 'YE',
  'Asia/Karachi': 'PK',
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Dhaka': 'BD',
  'Asia/Jakarta': 'ID',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Manila': 'PH',
  'Asia/Istanbul': 'TR',
  'Asia/Tehran': 'IR',
  'Asia/Shanghai': 'CN',
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Asia/Singapore': 'SG',
  'Europe/London': 'GB',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Vienna': 'AT',
  'Europe/Zurich': 'CH',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Warsaw': 'PL',
  'Europe/Lisbon': 'PT',
  'Europe/Athens': 'GR',
  'Europe/Moscow': 'RU',
  'Europe/Kyiv': 'UA',
  'Europe/Kiev': 'UA',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Mexico_City': 'MX',
  'America/Sao_Paulo': 'BR',
  'America/Buenos_Aires': 'AR',
  'Australia/Sydney': 'AU',
  'Pacific/Auckland': 'NZ',
};

/**
 * Guess the visitor's country from local signals only: the IANA timezone first,
 * then the browser's locale region, then Egypt as this platform's home market.
 */
export function detectCountryIso(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fromZone = TIMEZONE_COUNTRY[zone];
    if (fromZone && BY_ISO[fromZone]) return fromZone;
  } catch {
    /* Intl unavailable — fall through to the locale. */
  }

  const languages = typeof navigator !== 'undefined'
    ? navigator.languages ?? [navigator.language]
    : [];
  for (const language of languages) {
    const region = language?.split('-')[1]?.toUpperCase();
    if (region && BY_ISO[region]) return region;
  }

  return 'EG';
}

/** Split a stored phone into its country and national digits. */
export function parsePhone(value: string): { iso: string; national: string } | null {
  const digits = value.replace(/[^\d+]/g, '');
  if (!digits.startsWith('+')) return null;
  const match = BY_DIAL_DESC.find((country) => digits.startsWith(country.dial));
  if (!match) return null;
  return { iso: match.iso, national: digits.slice(match.dial.length).replace(/\D/g, '') };
}

/** Combine a country and national digits into a single stored `+<dial><digits>` value. */
export function buildPhone(iso: string, national: string): string {
  const country = BY_ISO[iso];
  return `${country?.dial ?? '+'}${national.replace(/\D/g, '')}`;
}
