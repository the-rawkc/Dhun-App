/**
 * Authentic High-Resolution Artist Images for Indian Artists & Singers
 * Sources: Official JioSaavn CDN & Wikimedia Commons
 */

export const KNOWN_ARTIST_PHOTOS = {
  'arijit singh': 'https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg',
  'diljit dosanjh': 'https://c.saavncdn.com/artists/Diljit_Dosanjh_005_20231025073054_500x500.jpg',
  'shreya ghoshal': 'https://c.saavncdn.com/artists/Shreya_Ghoshal_007_20241101074144_500x500.jpg',
  'karan aujla': 'https://c.saavncdn.com/artists/Karan_Aujla_005_20260925061936_500x500.jpg',
  'a. r. rahman': 'https://c.saavncdn.com/artists/AR_Rahman_002_20210120084455_500x500.jpg',
  'ar rahman': 'https://c.saavncdn.com/artists/AR_Rahman_002_20210120084455_500x500.jpg',
  'a r rahman': 'https://c.saavncdn.com/artists/AR_Rahman_002_20210120084455_500x500.jpg',
  'neha kakkar': 'https://c.saavncdn.com/artists/Neha_Kakkar_007_20241212115832_500x500.jpg',
  'sonu nigam': 'https://c.saavncdn.com/artists/Sonu_Nigam_003_20260813182013_500x500.jpg',
  'atif aslam': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Atif_Aslam_at_Badlapur_%28cropped%29.jpg/500px-Atif_Aslam_at_Badlapur_%28cropped%29.jpg',
  'badshah': 'https://c.saavncdn.com/artists/Badshah_006_20241118064015_500x500.jpg',
  'ap dhillon': 'https://c.saavncdn.com/artists/AP_Dhillon_004_20251023102150_500x500.jpg',
  'pritam': 'https://c.saavncdn.com/artists/Pritam_Chakraborty-20170711073326_500x500.jpg',
  'sid sriram': 'https://c.saavncdn.com/artists/Sid_Sriram_005_20240425180600_500x500.jpg',
  'anirudh ravichander': 'https://c.saavncdn.com/artists/Anirudh_Ravichander_003_20260121134149_500x500.jpg',
  'sidhu moose wala': 'https://c.saavncdn.com/artists/Sidhu_Moose_Wala_004_20250617183705_500x500.jpg',
  'jubin nautiyal': 'https://c.saavncdn.com/artists/Jubin_Nautiyal_003_20231130204020_500x500.jpg',
  'b praak': 'https://c.saavncdn.com/artists/B_Praak_001_20191118112005_500x500.jpg',
  'guru randhawa': 'https://c.saavncdn.com/artists/Guru_Randhawa_005_20261026140443_500x500.jpg',
  'armaan malik': 'https://c.saavncdn.com/artists/Armaan_Malik_006_20260813132832_500x500.jpg',
  'yo yo honey singh': 'https://c.saavncdn.com/artists/Yo_Yo_Honey_Singh_004_20260811095253_500x500.jpg',
  'honey singh': 'https://c.saavncdn.com/artists/Yo_Yo_Honey_Singh_004_20260811095253_500x500.jpg',
  'sunidhi chauhan': 'https://c.saavncdn.com/artists/Sunidhi_Chauhan_005_20250515061617_500x500.jpg',
  'kumar sanu': 'https://c.saavncdn.com/artists/Kumar_Sanu_500x500.jpg',
  'alka yagnik': 'https://c.saavncdn.com/artists/Alka_Yagnik_002_20220314192930_500x500.jpg',
  'kishore kumar': 'https://c.saavncdn.com/artists/Kishore_Kumar_500x500.jpg',
  'lata mangeshkar': 'https://c.saavncdn.com/artists/Lata_Mangeshkar_004_20230623105323_500x500.jpg',
  'darshan raval': 'https://c.saavncdn.com/artists/Darshan_Raval_006_20250807060352_500x500.jpg',
  'sachin-jigar': 'https://c.saavncdn.com/artists/Sachin_Jigar_003_20251222093820_500x500.jpg',
  'sachin jigar': 'https://c.saavncdn.com/artists/Sachin_Jigar_003_20251222093820_500x500.jpg',
  'udit narayan': 'https://c.saavncdn.com/artists/Udit_Narayan_500x500.jpg',
  'mohammed rafi': 'https://c.saavncdn.com/artists/Mohammed_Rafi_500x500.jpg',
  'shubh': 'https://c.saavncdn.com/artists/Shubh_002_20230522105156_500x500.jpg',
  'king': 'https://c.saavncdn.com/artists/King_006_20231024095147_500x500.jpg',
  'jasleen royal': 'https://c.saavncdn.com/artists/Jasleen_Royal_004_20231122114631_500x500.jpg',
  'vishal mishra': 'https://c.saavncdn.com/artists/Vishal_Mishra_005_20231102073238_500x500.jpg',
  'shilpa rao': 'https://c.saavncdn.com/artists/Shilpa_Rao_005_20231006132840_500x500.jpg',
};

const DEFAULT_ARTIST_AVATAR =
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80';

/**
 * Returns a high-res authentic artist photo if known, or sanitizes existing image.
 */
export const getArtistPhoto = (name, currentImage = '') => {
  if (name && typeof name === 'string') {
    const clean = name
      .toLowerCase()
      .replace(/[\.\,\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (KNOWN_ARTIST_PHOTOS[clean]) {
      return KNOWN_ARTIST_PHOTOS[clean];
    }

    // Partial match in known photos (e.g. "Arijit" -> "arijit singh")
    for (const [knownKey, url] of Object.entries(KNOWN_ARTIST_PHOTOS)) {
      if (clean === knownKey || (clean.length >= 4 && knownKey.includes(clean))) {
        return url;
      }
    }
  }

  // Reject generic unsplash placeholder URLs if we want a fresh avatar or fallback
  if (currentImage && typeof currentImage === 'string') {
    const isGenericStock =
      currentImage.includes('photo-1511671782779-c97d3d27a1d4') ||
      currentImage.includes('photo-1501386761578-eac5c94b800a') ||
      currentImage.includes('photo-1516450360452-9312f5e86fc7') ||
      currentImage.includes('photo-1493225457124-a3eb161ffa5f') ||
      currentImage.includes('photo-1470225620780-dba8ba36b745') ||
      currentImage.includes('photo-1445985543470-41fdd6ce388d') ||
      currentImage.includes('photo-1514525253161-7a46d19cd819') ||
      currentImage.includes('artist-default');

    if (!isGenericStock) {
      return currentImage;
    }
  }

  // Fallback to name-based Dicebear avatar if unknown
  if (name && typeof name === 'string') {
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=e11d48,be123c,9f1239&textColor=ffffff`;
  }

  return DEFAULT_ARTIST_AVATAR;
};
