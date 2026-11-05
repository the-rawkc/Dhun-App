// Transliterate Devanagari script to English (Latin)
const devanagariMap = {
  'अ':'a','आ':'aa','इ':'i','ई':'ee','उ':'u','ऊ':'oo','ऋ':'ri','ए':'e','ऐ':'ai','ओ':'o','औ':'au',
  'क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'ng','च':'ch','छ':'chh','ज':'j','झ':'jh','ञ':'ny',
  'ट':'t','ठ':'th','ड':'d','ढ':'dh','ण':'n','त':'t','थ':'th','द':'d','ध':'dh','न':'n',
  'प':'p','फ':'ph','ब':'b','भ':'bh','म':'m','य':'y','र':'r','ल':'l','व':'v','श':'sh','ष':'sh','स':'s','ह':'h',
  'ा':'a','ि':'i','ी':'ee','ु':'u','ू':'oo','ृ':'ri','े':'e','ै':'ai','ो':'o','ौ':'au','्':'',
  'ं':'n','ँ':'n','ः':'h','़':''
};

// Transliterate Gurmukhi (Punjabi) script to English (Latin)
const gurmukhiMap = {
  'ੳ':'u','ਅ':'a','ੲ':'e','ਸ':'s','ਹ':'h','ਕ':'k','ਖ':'kh','ਗ':'g','ਘ':'gh','ਙ':'ng',
  'ਚ':'ch','ਛ':'chh','ਜ':'j','ਝ':'jh','ਞ':'ny','ਟ':'t','ਠ':'th','ਡ':'d','ਢ':'dh','ਣ':'n',
  'ਤ':'t','ਥ':'th','ਦ':'d','ਧ':'dh','ਨ':'n','ਪ':'p','ਫ':'ph','ਬ':'b','ਭ':'bh','ਮ':'m',
  'ਯ':'y','ਰ':'r','ਲ':'l','ਵ':'v','ੜ':'r','ਾ':'a','ਿ':'i','ੀ':'ee','ੁ':'u','ੂ':'oo',
  'ੇ':'e','ੈ':'ai','ੋ':'o','ੌ':'au','ਂ':'n','ੰ':'n','ੱ':''
};

export const transliterateToEnglish = (text) => {
  if (!text || typeof text !== 'string') return '';
  let res = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1] || '';
    if (ch === '्' || ch === '੍') {
      continue; // halant / virama
    }
    if (devanagariMap[ch]) {
      res += devanagariMap[ch];
      if (/[\u0915-\u0939]/.test(ch)) {
        if (next === '्' || /[\u093E-\u094D]/.test(next) || !next || next === ' ') {
          // No inherent 'a' before halant, matra, or word boundary
        } else {
          res += 'a';
        }
      }
    } else if (gurmukhiMap[ch]) {
      res += gurmukhiMap[ch];
      if (/[\u0A15-\u0A39]/.test(ch)) {
        if (next === '੍' || /[\u0A3E-\u0A4D]/.test(next) || !next || next === ' ') {
          // No inherent 'a'
        } else {
          res += 'a';
        }
      }
    } else {
      res += ch;
    }
  }
  return res.replace(/a([aeiou])/gi, '$1').replace(/\s+/g, ' ').trim();
};

export const toEnglishText = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  let clean = raw.trim();

  // Clean unicode replacement character artifacts
  clean = clean.replace(/\uFFFD/g, '').replace(/\?{2,}/g, '').trim();

  // Remove common YouTube video descriptors
  clean = clean.replace(
    /\s*[\(\[](?:Official\s*(?:Music\s*)?Video|Full\s*Video|Official\s*Audio|Lyric\s*Video|Lyrical|Audio|Video|4K|8K|HQ|Visualizer|Teaser|Promo)[\)\]]/gi,
    ''
  );

  // If text has parentheses or brackets containing non-Latin characters, remove them if Latin text exists
  if (/[a-zA-Z]/.test(clean)) {
    clean = clean.replace(/[\(\[][^\x00-\x7F]+[\)\]]/g, '');
  }

  // If text is divided by | or / or -, extract the English/Latin segments
  if (clean.includes('|') || clean.includes(' / ')) {
    const parts = clean.split(/\s*[\/|]\s*/).map((p) => p.trim()).filter(Boolean);
    const latinParts = parts.filter((p) => /[a-zA-Z]{2,}/.test(p));
    if (latinParts.length > 0) {
      clean = latinParts.join(' - ');
    }
  }

  // If there are still non-Latin characters
  if (/[^\x00-\x7F]/.test(clean)) {
    if (/[a-zA-Z]{3,}/.test(clean)) {
      // Latin exists, strip non-Latin residues
      clean = clean.replace(/[^\x00-\x7F]+/g, ' ');
    } else {
      // Pure non-Latin text -> Transliterate to English
      clean = transliterateToEnglish(clean);
    }
  }

  // Clean leading and trailing punctuation and spaces
  clean = clean.replace(/^[\s\-\|\/:]+|[\s\-\|\/:]+$/g, '').replace(/\s{2,}/g, ' ').trim();

  // Capitalize properly
  if (/^[a-z]/.test(clean)) {
    clean = clean.replace(/\b[a-z]/g, (l) => l.toUpperCase());
  }

  return clean || raw;
};

export const getHighResArtwork = (url, videoId) => {
  if (typeof url === 'string' && url.trim()) {
    let clean = url.trim();

    // If Google CDN / yt3 / lh3
    if (clean.includes('googleusercontent.com') || clean.includes('ggpht.com')) {
      if (clean.includes('=w') || clean.includes('=s')) {
        clean = clean.replace(/=w\d+-h\d+[^"]*/g, '=w512-h512-l90-rj');
        clean = clean.replace(/=s\d+[^"]*/g, '=s512');
      }
      return clean;
    }

    // If YouTube img / ytimg.com, cleanly replace filename without creating invalid names like mqhqdefault
    if (clean.includes('ytimg.com')) {
      clean = clean.replace(/\/(?:default|mqdefault|sddefault)\.jpg/g, '/hqdefault.jpg');
      return clean;
    }

    return clean;
  }

  if (videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }

  return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=512&auto=format&fit=crop&q=80';
};

export const normalizeSong = (song, fallbackArtist = '') => {
  if (!song) return null;

  const videoId = song.videoId || song.id || (typeof song.url === 'string' && song.url.match(/v=([^&]+)/)?.[1]) || '';
  const rawTitle = song.title || song.name || 'Unknown Title';

  let artist = '';
  if (typeof song.artist === 'string' && song.artist.trim() && song.artist !== 'Unknown Artist') {
    artist = song.artist.trim();
  } else if (Array.isArray(song.artists) && song.artists.length > 0) {
    artist = song.artists
      .map((a) => (typeof a === 'string' ? a : a.name || ''))
      .filter((a) => a && a !== 'Unknown Artist')
      .join(', ');
  } else if (typeof song.author === 'string' && song.author.trim()) {
    artist = song.author.trim();
  } else if (typeof song.uploader === 'string' && song.uploader.trim()) {
    artist = song.uploader.trim();
  } else if (typeof song.channelTitle === 'string' && song.channelTitle.trim()) {
    artist = song.channelTitle.trim();
  } else if (typeof song.channel === 'string' && song.channel.trim()) {
    artist = song.channel.trim();
  } else if (typeof song.subtitle === 'string' && song.subtitle.trim() && !song.subtitle.includes('•')) {
    artist = song.subtitle.trim();
  }

  // If still empty, use fallbackArtist
  if (!artist && fallbackArtist && typeof fallbackArtist === 'string') {
    artist = fallbackArtist.trim();
  }

  // If still empty, extract artist from title (e.g. "Artist - Track" or "Track | Film | Artist")
  if (!artist && rawTitle.includes(' - ')) {
    const parts = rawTitle.split(' - ');
    if (parts.length >= 2) {
      artist = parts[0].trim();
    }
  } else if (!artist && rawTitle.includes(' | ')) {
    const parts = rawTitle.split(' | ');
    if (parts.length >= 2) {
      artist = parts[parts.length - 1].trim();
    }
  }

  // Final fallback
  if (!artist) {
    artist = 'Indian Artist';
  }

  // Clean title if title was "Artist - Song Title"
  let cleanTitle = rawTitle;
  if (rawTitle.includes(' - ') && artist && rawTitle.startsWith(artist)) {
    cleanTitle = rawTitle.replace(new RegExp(`^${artist}\\s*-\\s*`, 'i'), '').trim();
  }

  // Ensure title and artist are completely in clean English
  const title = toEnglishText(cleanTitle || rawTitle);
  const finalArtist = toEnglishText(artist);

  let rawThumbnail = '';
  if (Array.isArray(song.thumbnails) && song.thumbnails.length > 0) {
    rawThumbnail = song.thumbnails[song.thumbnails.length - 1]?.url || song.thumbnails[0]?.url;
  } else if (song.thumbnail) {
    rawThumbnail = song.thumbnail;
  } else if (song.image) {
    rawThumbnail = song.image;
  }

  const thumbnail = getHighResArtwork(rawThumbnail, videoId);

  return {
    videoId,
    id: videoId || song.browseId || String(Math.random()),
    title,
    name: title,
    artist: finalArtist,
    thumbnail,
    duration: song.duration || song.length || '',
    browseId: song.browseId,
    resultType: song.resultType || 'song',
  };
};

export const parseLRC = (lrcString) => {
  if (!lrcString || typeof lrcString !== 'string') return [];
  const lines = lrcString.split('\n');
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.?(\d{2,3})?\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const fraction = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) / 1000 : 0;
      const totalSeconds = minutes * 60 + seconds + fraction;
      const text = line.replace(timeRegex, '').trim();
      if (text) {
        result.push({ time: totalSeconds, text });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
};
