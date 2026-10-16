import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

// LovKey doesn't know where someone is until after sign-up, so guess the
// country from the browser's language (en-LK → LK, si → LK, en → US).
export const defaultPhoneCountry = (): CountryCode => {
  const known = new Set<string>(getCountries());
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of tags) {
    try {
      const region = new Intl.Locale(tag).maximize().region;
      if (region && known.has(region)) return region as CountryCode;
    } catch {
      // Not a valid language tag; try the next one.
    }
  }
  return 'US';
};

// The number in international (E.164) form, e.g. +94771234567, or null if it
// isn't a real number for that country. A number typed with its own "+" code
// wins over the country picked.
export const toE164 = (country: CountryCode, input: string): string | null => {
  const parsed = parsePhoneNumberFromString(input, country);
  return parsed?.isValid() ? parsed.number : null;
};

// Supabase stores numbers without the "+" (94771234567).
export const formatPhone = (phone: string): string => {
  const parsed = parsePhoneNumberFromString(phone.startsWith('+') ? phone : `+${phone}`);
  return parsed?.formatInternational() ?? phone;
};

// Every country as "Sri Lanka (+94)", sorted by name, for the country-code picker.
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export const PHONE_COUNTRY_OPTIONS = getCountries()
  .map((code) => ({ code, name: regionNames.of(code) ?? code, dial: getCountryCallingCode(code) }))
  .sort((a, b) => a.name.localeCompare(b.name));
