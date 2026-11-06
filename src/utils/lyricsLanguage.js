/**
 * Transliteration and Language rules for Dhun Lyrics:
 * - Hindi: Kept strictly in Hindi (Devanagari script)
 * - All other languages (Punjabi / Gurmukhi, Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati):
 *   Transliterated into English (Latin alphabet) so users can easily read and sing along!
 */

const INDIC_MAPS = {
  // Gurmukhi (Punjabi)
  gurmukhi: {
    'ਅ': 'a', 'ਆ': 'aa', 'ਇ': 'i', 'ਈ': 'ee', 'ਉ': 'u', 'ਊ': 'oo', 'ਏ': 'e', 'ਐ': 'ai', 'ਓ': 'o', 'ਔ': 'au',
    'ਕ': 'k', 'ਖ': 'kh', 'ਗ': 'g', 'ਘ': 'gh', 'ਙ': 'ng',
    'ਚ': 'ch', 'ਛ': 'chh', 'ਜ': 'j', 'ਝ': 'jh', 'ਞ': 'ny',
    'ਟ': 't', 'ਠ': 'th', 'ਡ': 'd', 'ਢ': 'dh', 'ਣ': 'n',
    'ਤ': 't', 'ਥ': 'th', 'ਦ': 'd', 'ਧ': 'dh', 'ਨ': 'n',
    'ਪ': 'p', 'ਫ': 'ph', 'ਬ': 'b', 'ਭ': 'bh', 'ਮ': 'm',
    'ਯ': 'y', 'ਰ': 'r', 'ਲ': 'l', 'ਵ': 'v', 'ੜ': 'r',
    'ਸ਼': 'sh', 'ਸ': 's', 'ਹ': 'h', 'ਖ਼': 'kh', 'ਗ਼': 'gh', 'ਜ਼': 'z', 'ਫ਼': 'f',
    'ਾ': 'aa', 'ਿ': 'i', 'ੀ': 'ee', 'ੁ': 'u', 'ੂ': 'oo', 'ੇ': 'e', 'ੈ': 'ai', 'ੋ': 'o', 'ੌ': 'au',
    'ੰ': 'n', 'ਂ': 'n', 'ੱ': '', '੍': '', 'ੴ': 'Ik Onkar'
  },
  // Tamil
  tamil: {
    'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ee', 'உ': 'u', 'ஊ': 'oo', 'எ': 'e', 'ஏ': 'ae', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oa', 'ஔ': 'au',
    'க': 'k', 'ங': 'ng', 'ச': 'ch', 'ஞ': 'ny', 'ட': 't', 'ண': 'n', 'த': 'th', 'ந': 'n', 'ப': 'p', 'ம': 'm',
    'ய': 'y', 'ர': 'r', 'ல': 'l', 'வ': 'v', 'ழ': 'zh', 'ள': 'l', 'ற': 'r', 'ன': 'n', 'ஜ': 'j', 'ஷ': 'sh', 'ஸ': 's', 'ஹ': 'h',
    'ா': 'aa', 'ி': 'i', 'ீ': 'ee', 'ு': 'u', 'ூ': 'oo', 'ெ': 'e', 'ே': 'ae', 'ை': 'ai', 'ொ': 'o', 'ோ': 'oa', 'ௌ': 'au',
    '்': '', 'ஃ': 'k'
  },
  // Telugu
  telugu: {
    'అ': 'a', 'ఆ': 'aa', 'ఇ': 'i', 'ఈ': 'ee', 'ఉ': 'u', 'ఊ': 'oo', 'ఋ': 'ru', 'ఎ': 'e', 'ఏ': 'ae', 'ఐ': 'ai', 'ఒ': 'o', 'ఓ': 'oa', 'ఔ': 'au',
    'క': 'k', 'ఖ': 'kh', 'గ': 'g', 'ఘ': 'gh', 'ఙ': 'ng',
    'చ': 'ch', 'ఛ': 'chh', 'జ': 'j', 'ఝ': 'jh', 'ఞ': 'ny',
    'ట': 't', 'ఠ': 'th', 'డ': 'd', 'ఢ': 'dh', 'ణ': 'n',
    'త': 'th', 'థ': 'th', 'ద': 'd', 'ధ': 'dh', 'న': 'n',
    'ప': 'p', 'ఫ': 'ph', 'బ': 'b', 'భ': 'bh', 'మ': 'm',
    'య': 'y', 'ర': 'r', 'ల': 'l', 'వ': 'v', 'శ': 'sh', 'ష': 'sh', 'స': 's', 'హ': 'h', 'ళ': 'l',
    'ా': 'aa', 'ి': 'i', 'ీ': 'ee', 'ు': 'u', 'ూ': 'oo', 'ృ': 'ru', 'ె': 'e', 'ే': 'ae', 'ై': 'ai', 'ొ': 'o', 'ో': 'oa', 'ౌ': 'au',
    '్': '', 'ం': 'm', 'ః': 'h'
  },
  // Malayalam
  malayalam: {
    'അ': 'a', 'ആ': 'aa', 'ഇ': 'i', 'ഈ': 'ee', 'ഉ': 'u', 'ഊ': 'oo', 'ഋ': 'ru', 'എ': 'e', 'ഏ': 'ae', 'ഐ': 'ai', 'ഒ': 'o', 'ഓ': 'oa', 'ഔ': 'au',
    'ക': 'k', 'ഖ': 'kh', 'ഗ': 'g', 'ഘ': 'gh', 'ങ': 'ng',
    'ച': 'ch', 'ഛ': 'chh', 'ജ': 'j', 'ഝ': 'jh', 'ഞ': 'ny',
    'ട': 't', 'ഠ': 'th', 'ഡ': 'd', 'ഢ': 'dh', 'ണ': 'n',
    'ത': 'th', 'ഥ': 'th', 'ദ': 'd', 'ധ': 'dh', 'ന': 'n',
    'പ': 'p', 'ഫ': 'ph', 'ബ': 'b', 'ഭ': 'bh', 'മ': 'm',
    'യ': 'y', 'ര': 'r', 'ല': 'l', 'വ': 'v', 'ശ': 'sh', 'ഷ': 'sh', 'സ': 's', 'ഹ': 'h', 'ള': 'l', 'ഴ': 'zh', 'റ': 'r',
    'ാ': 'aa', 'ി': 'i', 'ീ': 'ee', 'ു': 'u', 'ൂ': 'oo', 'ൃ': 'ru', 'െ': 'e', 'േ': 'ae', 'ൈ': 'ai', 'ൊ': 'o', 'ോ': 'oa', 'ൌ': 'au',
    '്': '', 'ം': 'm'
  },
  // Kannada
  kannada: {
    'ಅ': 'a', 'ಆ': 'aa', 'ಇ': 'i', 'ಈ': 'ee', 'ಉ': 'u', 'ಊ': 'oo', 'ಋ': 'ru', 'ಎ': 'e', 'ಏ': 'ae', 'ಐ': 'ai', 'ಒ': 'o', 'ಓ': 'oa', 'ಔ': 'au',
    'ಕ': 'k', 'ಖ': 'kh', 'ಗ': 'g', 'ಘ': 'gh', 'ಙ': 'ng',
    'ಚ': 'ch', 'ಛ': 'chh', 'ಜ': 'j', 'ಝ': 'jh', 'ಞ': 'ny',
    'ಟ': 't', 'ಠ': 'th', 'ಡ': 'd', 'ಢ': 'dh', 'ಣ': 'n',
    'ತ': 'th', 'ಥ': 'th', 'ದ': 'd', 'ಧ': 'dh', 'ನ': 'n',
    'ಪ': 'p', 'ಫ': 'ph', 'ಬ': 'b', 'ಭ': 'bh', 'ಮ': 'm',
    'ಯ': 'y', 'ರ': 'r', 'ಲ': 'l', 'ವ': 'v', 'ಶ': 'sh', 'ಷ': 'sh', 'ಸ': 's', 'ಹ': 'h', 'ಳ': 'l',
    'ಾ': 'aa', 'ಿ': 'i', 'ೀ': 'ee', 'ು': 'u', 'ೂ': 'oo', 'ೃ': 'ru', 'ೆ': 'e', 'ೇ': 'ae', 'ೈ': 'ai', 'ೊ': 'o', 'ೋ': 'oa', 'ೌ': 'au',
    '್': '', 'ಂ': 'm'
  },
  // Bengali
  bengali: {
    'অ': 'o', 'আ': 'aa', 'ই': 'i', 'ঈ': 'ee', 'উ': 'u', 'ঊ': 'oo', 'ঋ': 'ri', 'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
    'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
    'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'ny',
    'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
    'ত': 't', 'থ': 'th', 'দ': 'd', 'ಧ': 'dh', 'ন': 'n',
    'প': 'p', 'ফ': 'ph', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
    'য': 'y', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h', 'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y',
    'া': 'aa', 'ি': 'i', 'ী': 'ee', 'ু': 'u', 'ূ': 'oo', 'ৃ': 'ri', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
    '্': '', 'ং': 'ng', 'ঃ': 'h'
  },
  // Gujarati
  gujarati: {
    'અ': 'a', 'આ': 'aa', 'ઇ': 'i', 'ઈ': 'ee', 'ઉ': 'u', 'ઊ': 'oo', 'એ': 'e', 'ઐ': 'ai', 'ઓ': 'o', 'ઔ': 'au',
    'ક': 'k', 'ખ': 'kh', 'ગ': 'g', 'ઘ': 'gh', 'ઙ': 'ng',
    'ચ': 'ch', 'છ': 'chh', 'જ': 'j', 'ઝ': 'jh', 'ઞ': 'ny',
    'ટ': 't', 'ઠ': 'th', 'ડ': 'd', 'ઢ': 'dh', 'ણ': 'n',
    'ત': 't', 'થ': 'th', 'દ': 'd', 'ધ': 'dh', 'ન': 'n',
    'પ': 'p', 'ફ': 'ph', 'બ': 'b', 'ભ': 'bh', 'મ': 'm',
    'ય': 'y', 'ર': 'r', 'લ': 'l', 'વ': 'v', 'શ': 'sh', 'ષ': 'sh', 'સ': 's', 'હ': 'h', 'ળ': 'l',
    'ા': 'aa', 'િ': 'i', 'ી': 'ee', 'ુ': 'u', 'ૂ': 'oo', 'ે': 'e', 'ૈ': 'ai', 'ો': 'o', 'ૌ': 'au',
    '્': '', 'ં': 'n', 'ઃ': 'h'
  }
};

/**
 * Transliterates non-Hindi Indic scripts (Gurmukhi, Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati)
 * into English (Latin) script.
 * Leaves Hindi (Devanagari \u0900-\u097F) completely intact.
 */
export function formatLyricsByLanguage(text) {
  if (!text || typeof text !== 'string') return text;

  // If text is primarily Hindi (Devanagari \u0900-\u097F), keep it in Hindi!
  const hasHindi = /[\u0900-\u097F]/.test(text);
  const hasGurmukhi = /[\u0A00-\u0A7F]/.test(text);
  const hasBengali = /[\u0980-\u09FF]/.test(text);
  const hasGujarati = /[\u0A80-\u0AFF]/.test(text);
  const hasTamil = /[\u0B80-\u0BFF]/.test(text);
  const hasTelugu = /[\u0C00-\u0C7F]/.test(text);
  const hasKannada = /[\u0C80-\u0CFF]/.test(text);
  const hasMalayalam = /[\u0D00-\u0D7F]/.test(text);

  // If it is Hindi and has no other scripts, keep Hindi strictly in Hindi (Devanagari)
  if (hasHindi && !hasGurmukhi && !hasTamil && !hasTelugu && !hasKannada && !hasMalayalam) {
    return text;
  }

  // Transliterate non-Hindi Indic characters
  let output = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const code = ch.charCodeAt(0);

    // Gurmukhi (\u0A00 - \u0A7F)
    if (code >= 0x0A00 && code <= 0x0A7F) {
      output += INDIC_MAPS.gurmukhi[ch] !== undefined ? INDIC_MAPS.gurmukhi[ch] : ch;
    }
    // Tamil (\u0B80 - \u0BFF)
    else if (code >= 0x0B80 && code <= 0x0BFF) {
      output += INDIC_MAPS.tamil[ch] !== undefined ? INDIC_MAPS.tamil[ch] : ch;
    }
    // Telugu (\u0C00 - \u0C7F)
    else if (code >= 0x0C00 && code <= 0x0C7F) {
      output += INDIC_MAPS.telugu[ch] !== undefined ? INDIC_MAPS.telugu[ch] : ch;
    }
    // Malayalam (\u0D00 - \u0D7F)
    else if (code >= 0x0D00 && code <= 0x0D7F) {
      output += INDIC_MAPS.malayalam[ch] !== undefined ? INDIC_MAPS.malayalam[ch] : ch;
    }
    // Kannada (\u0C80 - \u0CFF)
    else if (code >= 0x0C80 && code <= 0x0CFF) {
      output += INDIC_MAPS.kannada[ch] !== undefined ? INDIC_MAPS.kannada[ch] : ch;
    }
    // Gujarati (\u0A80 - \u0AFF)
    else if (code >= 0x0A80 && code <= 0x0AFF) {
      output += INDIC_MAPS.gujarati[ch] !== undefined ? INDIC_MAPS.gujarati[ch] : ch;
    }
    // Bengali (\u0980 - \u09FF)
    else if (code >= 0x0980 && code <= 0x09FF) {
      output += INDIC_MAPS.bengali[ch] !== undefined ? INDIC_MAPS.bengali[ch] : ch;
    }
    else {
      output += ch;
    }
  }

  // Clean up duplicate spaces or awkward transliteration gaps
  return output.replace(/\s+/g, ' ');
}
