/**
 * Transliteration and Language rules for Dhun Lyrics:
 * - Hindi & Haryanvi: Kept strictly in Hindi (Devanagari script) or as it is.
 * - Punjabi (Gurmukhi): Converted directly to Hindi (Devanagari script) with live running timestamps intact!
 * - South Indian / other regional scripts: Transliterated to easy-to-read script.
 */

// 1:1 Precise Unicode Mapping from Punjabi (Gurmukhi) to Hindi (Devanagari)
export const GURMUKHI_TO_HINDI_MAP = {
  // Vowels
  'ਅ': 'अ', 'ਆ': 'आ', 'ਇ': 'इ', 'ਈ': 'ई', 'ਉ': 'उ', 'ਊ': 'ऊ', 'ਏ': 'ए', 'ਐ': 'ऐ', 'ਓ': 'ओ', 'ਔ': 'औ',
  // Consonants
  'ਕ': 'क', 'ਖ': 'ख', 'ਗ': 'ग', 'ਘ': 'घ', 'ਙ': 'ङ',
  'ਚ': 'च', 'ਛ': 'छ', 'ਜ': 'ज', 'ਝ': 'झ', 'ਞ': 'ञ',
  'ਟ': 'ट', 'ਠ': 'ठ', 'ਡ': 'ड', 'ਢ': 'ढ', 'ਣ': 'ण',
  'ਤ': 'त', 'ਥ': 'थ', 'ਦ': 'द', 'ਧ': 'ध', 'ਨ': 'न',
  'ਪ': 'प', 'ਫ': 'फ', 'ਬ': 'ब', 'ਭ': 'भ', 'ਮ': 'म',
  'ਯ': 'य', 'ਰ': 'र', 'ਲ': 'ल', 'ਵ': 'व', 'ਸ': 'स', 'ਹ': 'ह',
  'ੜ': 'ड़', 'ਸ਼': 'श', 'ਖ਼': 'ख़', 'ਗ਼': 'ग़', 'ਜ਼': 'ज़', 'ਫ਼': 'फ़', 'ਲ਼': 'ळ',
  // Matras (Vowel signs)
  'ਾ': 'ा', 'ਿ': 'ि', 'ੀ': 'ी', 'ੁ': 'ु', 'ੂ': 'ू', 'ੇ': 'े', 'ੈ': 'ै', 'ੋ': 'ो', 'ੌ': 'ौ',
  // Modifiers
  'ੰ': 'ं', 'ਂ': 'ं', '੍': '्', '਼': '़',
  // Digits
  '੦': '०', '੧': '१', '੨': '२', '੩': '३', '੪': '४', '੫': '५', '੬': '६', '੭': '७', '੮': '८', '੯': '९',
  // Sacred
  'ੴ': 'एक ओंकार'
};

const INDIC_ROMAN_MAPS = {
  tamil: {
    'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ee', 'உ': 'u', 'ஊ': 'oo', 'எ': 'e', 'ஏ': 'ae', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oa', 'ஔ': 'au',
    'க': 'k', 'ங': 'ng', 'ச': 'ch', 'ஞ': 'ny', 'ட': 't', 'ண': 'n', 'த': 'th', 'ந': 'n', 'ப': 'p', 'ம': 'm',
    'ய': 'y', 'ர': 'r', 'ல': 'l', 'ਵ': 'v', 'ழ': 'zh', 'ள': 'l', 'ற': 'r', 'ன': 'n', 'ஜ': 'j', 'ஷ': 'sh', 'ஸ': 's', 'ஹ': 'h',
    'ா': 'aa', 'ி': 'i', 'ੀ': 'ee', 'ு': 'u', 'ூ': 'oo', 'ெ': 'e', 'ே': 'ae', 'ை': 'ai', 'ொ': 'o', 'ோ': 'oa', 'ௌ': 'au',
    '்': '', 'ஃ': 'k'
  },
  telugu: {
    'అ': 'a', 'ఆ': 'aa', 'ఇ': 'i', 'ఈ': 'ee', 'ఉ': 'u', 'ఊ': 'oo', 'ఋ': 'ru', 'ఎ': 'e', 'ఏ': 'ae', 'ఐ': 'ai', 'ఒ': 'o', 'ఓ': 'oa', 'ఔ': 'au',
    'క': 'k', 'ఖ': 'kh', 'గ': 'g', 'ఘ': 'gh', 'ఙ': 'ng',
    'చ': 'ch', 'ఛ': 'chh', 'జ': 'j', 'ఝ': 'jh', 'ఞ': 'ny',
    'ట': 't', 'ఠ': 'th', 'డ': 'd', 'ఢ': 'dh', 'ణ': 'n',
    'త': 'th', 'థ': 'th', 'ద': 'd', 'ధ': 'dh', 'న': 'n',
    'ప': 'p', 'ఫ': 'ph', 'ਬ': 'b', 'భ': 'bh', 'మ': 'm',
    'య': 'y', 'ర': 'r', 'ల': 'l', 'వ': 'v', 'శ': 'sh', 'ష': 'sh', 'స': 's', 'హ': 'h', 'ళ': 'l',
    'ా': 'aa', 'ి': 'i', 'ీ': 'ee', 'ੁ': 'u', 'ੂ': 'oo', 'ృ': 'ru', 'ె': 'e', 'ే': 'ae', 'ై': 'ai', 'ొ': 'o', 'ో': 'oa', 'ౌ': 'au',
    '్': '', 'ం': 'm', 'ః': 'h'
  },
  bengali: {
    'অ': 'o', 'আ': 'aa', 'ই': 'i', 'ঈ': 'ee', 'উ': 'u', 'ঊ': 'oo', 'ঋ': 'ri', 'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
    'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
    'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'ny',
    'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
    'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
    'প': 'p', 'ফ': 'ph', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
    'য': 'y', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h', 'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y',
    'া': 'aa', 'ি': 'i', 'ী': 'ee', 'ু': 'u', 'ূ': 'oo', 'ৃ': 'ri', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
    '্': '', 'ং': 'ng', 'ঃ': 'h'
  }
};

/**
 * Converts Punjabi (Gurmukhi) text into Hindi (Devanagari) script.
 * Correctly resolves the Addak (consonant doubler).
 */
export function punjabiToHindi(text) {
  if (!text || typeof text !== 'string') return text;
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === 'ੱ' && i + 1 < text.length) {
      // Addak doubles the next consonant with a halant (e.g. ੱਤ -> त्त)
      const nextCh = text[i + 1];
      const nextHindi = GURMUKHI_TO_HINDI_MAP[nextCh] || nextCh;
      out += nextHindi + '्';
    } else if (GURMUKHI_TO_HINDI_MAP[ch] !== undefined) {
      out += GURMUKHI_TO_HINDI_MAP[ch];
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Formats lyrics according to language preferences:
 * - Punjabi (Gurmukhi): Converted to Hindi (Devanagari) with live running timestamps intact!
 * - Haryanvi & Hindi: Kept in Hindi (Devanagari) or as it is.
 * - Other regional Indic scripts (Tamil, Telugu, Bengali): Transliterated for sing-along readability.
 */
export function formatLyricsByLanguage(text) {
  if (!text || typeof text !== 'string') return text;

  // 1. If text contains Gurmukhi (Punjabi \u0A00-\u0A7F), convert to Hindi (Devanagari)
  if (/[\u0A00-\u0A7F]/.test(text)) {
    return punjabiToHindi(text);
  }

  // 2. Hindi & Haryanvi (Devanagari \u0900-\u097F) -> Keep exactly in Hindi as requested!
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  const hasBengali = /[\u0980-\u09FF]/.test(text);
  const hasTamil = /[\u0B80-\u0BFF]/.test(text);
  const hasTelugu = /[\u0C00-\u0C7F]/.test(text);

  if (hasDevanagari && !hasTamil && !hasTelugu && !hasBengali) {
    return text;
  }

  // 3. For other regional scripts, convert using Roman transliteration maps
  let result = text;
  for (const map of Object.values(INDIC_ROMAN_MAPS)) {
    for (const [char, latin] of Object.entries(map)) {
      if (result.includes(char)) {
        result = result.split(char).join(latin);
      }
    }
  }

  return result;
}
