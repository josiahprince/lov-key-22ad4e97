// Languages offered in Settings → Match preferences: a fixed set of widely
// spoken languages, plus local ones for the country on the user's profile.

export const POPULAR_LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Chinese',
  'Japanese', 'Korean', 'Arabic', 'Hindi', 'Russian',
];

// Keyed by lower-case English country name, as getDeviceLocation() in
// src/lib/location.ts stores it. Aliases cover other spellings, including ones
// typed by hand before location became automatic.
const LOCAL_LANGUAGES: Record<string, string[]> = {
  india: ['Bengali', 'Telugu', 'Marathi', 'Tamil', 'Urdu', 'Gujarati', 'Kannada', 'Malayalam', 'Odia', 'Punjabi', 'Assamese'],
  pakistan: ['Urdu', 'Punjabi', 'Sindhi', 'Pashto', 'Balochi'],
  bangladesh: ['Bengali', 'Sylheti'],
  'sri lanka': ['Sinhala', 'Tamil'],
  nepal: ['Nepali', 'Maithili', 'Bhojpuri'],
  philippines: ['Tagalog', 'Cebuano', 'Ilocano', 'Hiligaynon'],
  indonesia: ['Indonesian', 'Javanese', 'Sundanese', 'Balinese'],
  malaysia: ['Malay', 'Tamil', 'Cantonese', 'Hokkien'],
  singapore: ['Malay', 'Tamil', 'Hokkien', 'Cantonese'],
  thailand: ['Thai', 'Lao', 'Isan'],
  vietnam: ['Vietnamese'],
  china: ['Cantonese', 'Shanghainese', 'Hokkien', 'Uyghur', 'Tibetan'],
  'hong kong': ['Cantonese'],
  taiwan: ['Taiwanese Hokkien', 'Hakka'],
  japan: ['Okinawan'],
  'south korea': [],
  turkey: ['Turkish', 'Kurdish'],
  iran: ['Persian', 'Azerbaijani', 'Kurdish'],
  iraq: ['Kurdish'],
  israel: ['Hebrew'],
  egypt: ['Egyptian Arabic'],
  'saudi arabia': [],
  'united arab emirates': ['Urdu', 'Malayalam'],
  nigeria: ['Yoruba', 'Hausa', 'Igbo', 'Nigerian Pidgin'],
  ghana: ['Twi', 'Ga', 'Ewe'],
  kenya: ['Swahili', 'Kikuyu', 'Luo'],
  tanzania: ['Swahili'],
  uganda: ['Swahili', 'Luganda'],
  ethiopia: ['Amharic', 'Oromo', 'Tigrinya'],
  'south africa': ['Afrikaans', 'Zulu', 'Xhosa', 'Sotho', 'Tswana'],
  morocco: ['Darija', 'Amazigh'],
  algeria: ['Darija', 'Amazigh'],
  senegal: ['Wolof'],
  'united states': ['Spanish', 'Vietnamese', 'Tagalog', 'Navajo'],
  canada: ['Punjabi', 'Cantonese', 'Tagalog'],
  mexico: ['Nahuatl', 'Yucatec Maya'],
  brazil: [],
  peru: ['Quechua', 'Aymara'],
  bolivia: ['Quechua', 'Aymara', 'Guarani'],
  paraguay: ['Guarani'],
  'united kingdom': ['Welsh', 'Scottish Gaelic', 'Punjabi', 'Urdu', 'Polish'],
  ireland: ['Irish'],
  spain: ['Catalan', 'Galician', 'Basque'],
  portugal: [],
  france: ['Breton', 'Occitan'],
  belgium: ['Dutch', 'Flemish'],
  netherlands: ['Dutch', 'Frisian'],
  switzerland: ['Swiss German', 'Romansh'],
  austria: [],
  germany: ['Turkish', 'Polish'],
  italy: ['Sicilian', 'Neapolitan', 'Sardinian'],
  poland: ['Polish', 'Silesian'],
  ukraine: ['Ukrainian'],
  romania: ['Romanian', 'Hungarian'],
  hungary: ['Hungarian'],
  greece: ['Greek'],
  sweden: ['Swedish', 'Finnish'],
  norway: ['Norwegian', 'Sami'],
  denmark: ['Danish'],
  finland: ['Finnish', 'Swedish'],
  australia: ['Greek', 'Vietnamese', 'Cantonese'],
  'new zealand': ['Maori', 'Samoan'],
};

const ALIASES: Record<string, string> = {
  usa: 'united states',
  'united states of america': 'united states',
  us: 'united states',
  uk: 'united kingdom',
  'great britain': 'united kingdom',
  england: 'united kingdom',
  scotland: 'united kingdom',
  wales: 'united kingdom',
  uae: 'united arab emirates',
  türkiye: 'turkey',
  'republic of korea': 'south korea',
  korea: 'south korea',
  nederland: 'netherlands',
};

const normaliseCountry = (country: string) => {
  const key = country.trim().toLowerCase();
  return ALIASES[key] ?? key;
};

// Popular languages first, then the user's local ones, de-duplicated. A language
// the user already chose that is in neither list still shows as a selected badge.
export const getLanguageOptions = (country?: string | null): string[] => {
  const local = country ? LOCAL_LANGUAGES[normaliseCountry(country)] ?? [] : [];
  return [...new Set([...POPULAR_LANGUAGES, ...local])];
};
