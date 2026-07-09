// Languages supported by Lumen. `code` is BCP-47-ish, `name` is English,
// `native` is autonym. Grouped for the picker UI.

export type Language = {
  code: string;
  name: string;
  native: string;
  group: "Popular" | "Indian" | "European" | "Asian" | "Middle East & Africa" | "Americas";
};

export const LANGUAGES: Language[] = [
  // Popular / default
  { code: "en", name: "English", native: "English", group: "Popular" },
  { code: "hi", name: "Hindi", native: "हिन्दी", group: "Popular" },

  // All 22 Indian scheduled languages (8th Schedule of the Indian Constitution)
  { code: "as", name: "Assamese", native: "অসমীয়া", group: "Indian" },
  { code: "bn", name: "Bengali", native: "বাংলা", group: "Indian" },
  { code: "brx", name: "Bodo", native: "बड़ो", group: "Indian" },
  { code: "doi", name: "Dogri", native: "डोगरी", group: "Indian" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી", group: "Indian" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", group: "Indian" },
  { code: "ks", name: "Kashmiri", native: "کٲشُر", group: "Indian" },
  { code: "kok", name: "Konkani", native: "कोंकणी", group: "Indian" },
  { code: "mai", name: "Maithili", native: "मैथिली", group: "Indian" },
  { code: "ml", name: "Malayalam", native: "മലയാളം", group: "Indian" },
  { code: "mni", name: "Manipuri (Meitei)", native: "মৈতৈলোন্", group: "Indian" },
  { code: "mr", name: "Marathi", native: "मराठी", group: "Indian" },
  { code: "ne", name: "Nepali", native: "नेपाली", group: "Indian" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ", group: "Indian" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", group: "Indian" },
  { code: "sa", name: "Sanskrit", native: "संस्कृतम्", group: "Indian" },
  { code: "sat", name: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ", group: "Indian" },
  { code: "sd", name: "Sindhi", native: "سنڌي", group: "Indian" },
  { code: "ta", name: "Tamil", native: "தமிழ்", group: "Indian" },
  { code: "te", name: "Telugu", native: "తెలుగు", group: "Indian" },
  { code: "ur", name: "Urdu", native: "اردو", group: "Indian" },

  // European
  { code: "es", name: "Spanish", native: "Español", group: "European" },
  { code: "fr", name: "French", native: "Français", group: "European" },
  { code: "de", name: "German", native: "Deutsch", group: "European" },
  { code: "it", name: "Italian", native: "Italiano", group: "European" },
  { code: "pt", name: "Portuguese", native: "Português", group: "European" },
  { code: "nl", name: "Dutch", native: "Nederlands", group: "European" },
  { code: "ru", name: "Russian", native: "Русский", group: "European" },
  { code: "pl", name: "Polish", native: "Polski", group: "European" },
  { code: "sv", name: "Swedish", native: "Svenska", group: "European" },
  { code: "tr", name: "Turkish", native: "Türkçe", group: "European" },
  { code: "uk", name: "Ukrainian", native: "Українська", group: "European" },
  { code: "el", name: "Greek", native: "Ελληνικά", group: "European" },

  // Asian
  { code: "zh", name: "Chinese (Simplified)", native: "简体中文", group: "Asian" },
  { code: "zh-TW", name: "Chinese (Traditional)", native: "繁體中文", group: "Asian" },
  { code: "ja", name: "Japanese", native: "日本語", group: "Asian" },
  { code: "ko", name: "Korean", native: "한국어", group: "Asian" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt", group: "Asian" },
  { code: "th", name: "Thai", native: "ไทย", group: "Asian" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia", group: "Asian" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu", group: "Asian" },
  { code: "fil", name: "Filipino", native: "Filipino", group: "Asian" },

  // Middle East & Africa
  { code: "ar", name: "Arabic", native: "العربية", group: "Middle East & Africa" },
  { code: "fa", name: "Persian", native: "فارسی", group: "Middle East & Africa" },
  { code: "he", name: "Hebrew", native: "עברית", group: "Middle East & Africa" },
  { code: "sw", name: "Swahili", native: "Kiswahili", group: "Middle East & Africa" },
  { code: "am", name: "Amharic", native: "አማርኛ", group: "Middle East & Africa" },

  // Americas
  { code: "pt-BR", name: "Portuguese (Brazil)", native: "Português (Brasil)", group: "Americas" },
  { code: "es-MX", name: "Spanish (Latin America)", native: "Español (Latinoamérica)", group: "Americas" },
];

export const DEFAULT_LANGUAGE = "en";

export function findLanguage(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

export function languageLabel(code: string): string {
  const l = findLanguage(code);
  return l ? `${l.name} (${l.native})` : code;
}