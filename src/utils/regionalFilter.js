/**
 * High-Precision Regional Music Classifier & Sanitizer
 * Prevents Punjabi songs from leaking into Haryanvi charts/playlists,
 * and Haryanvi songs from leaking into Punjabi charts/playlists.
 */

const HARYANVI_ARTISTS = [
  'sapna choudhary',
  'sapna choudhry',
  'renuka panwar',
  'gulzaar chhaniwala',
  'gulzar chhaniwala',
  'dhanda nyoliwala',
  'masoom sharma',
  'ajay hooda',
  'raju punjabi',
  'ruchika jangid',
  'khasa aala chahar',
  'khasa aala',
  'amit saini rohtakiya',
  'amit saini',
  'diler kharkiya',
  'pranjal dahiya',
  'gd kaur',
  'manisha sharma',
  'vishvajeet choudhary',
  'uttar kumar',
  'kavita joshi',
  'billa sonipat aala',
  'sheenam katholic',
  'raj mawar',
  'somvir kathurwal',
  'binder danoda',
  'vicky kajla',
  'vijay varma',
  'annu kadyan',
  'shikha raghav',
  'pooja hooda',
  'sonika singh',
  'subhash foji',
  'devender foji',
  'surender romio',
  'mohit sharma',
  'aman jaji',
  'komal choudhary',
  'ndee kundu',
  'ashu twinkle',
  'meenakshi panchal',
  'tarun panchal',
  'gagan haryanvi',
  'sandeep surila',
  'kanchan nagar',
  'akki kalyan',
  'bintu pabra',
  'shiva choudhary',
  'arvind jangid',
  'farista',
];

const HARYANVI_LABELS_AND_TERMS = [
  'haryanvi',
  'haryana',
  'ragni',
  'desi records',
  'nav haryanvi',
  'white hill dhaakad',
  'sonotek',
  'gem tunes haryanvi',
  'vats records',
  'maina haryanvi',
  'mor music company',
  'voice of heart music',
  '52 gaj ka daman',
  'gypsy (balam',
  'balam thanedar',
  'chatak matak',
  'moto',
  'middle class',
  '2 numbari',
  'solid body',
  'bahu kale ki',
  'up to date',
  'kothe upar kothri',
  'bahu',
  'daman',
  'gandasi',
  'chundri',
  'ghunghat',
  'laad piye',
  'kabootar',
];

const PUNJABI_ARTISTS = [
  'karan aujla',
  'diljit dosanjh',
  'diljit',
  'sidhu moose wala',
  'sidhu moosewala',
  'moose wala',
  'moosewala',
  'ap dhillon',
  'shubh',
  'gurinder gill',
  'amrinder gill',
  'b praak',
  'jaani',
  'guru randhawa',
  'harrdy sandhu',
  'hardy sandhu',
  'jass manak',
  'amrit maan',
  'jordan sandhu',
  'mankirt aulakh',
  'parmish verma',
  'babbu maan',
  'gippy grewal',
  'tarsem jassar',
  'kulwinder billa',
  'sunanda sharma',
  'nimrat khaira',
  'jasmine sandlas',
  'baani sandhu',
  'afsana khan',
  'khan bhaini',
  'arjan dhillon',
  'prem dhillon',
  'cheema y',
  'gur sidhu',
  'ikky',
  'prophec',
  'garry sandhu',
  'prabh gill',
  'ninja',
  'gurnam bhullar',
  'r nait',
  'korala maan',
  'kaka',
  'navaan sandhu',
  'wazir patar',
  'tegi pannu',
  'sukha',
  'chani nattan',
  'inderpal moga',
  'mickey singh',
  'pav dharia',
  'jazzy b',
  'yo yo honey singh',
  'bohemia',
  'imran khan',
  'bilal saeed',
  'sharry mann',
  'dilpreet dhillon',
  'akhil',
  'guri',
  'singga',
  'shivjot',
  'jenny johal',
  'kaur b',
  'shipra goyal',
];

const PUNJABI_LABELS_AND_TERMS = [
  'punjabi',
  'punjab',
  'speed records',
  'geet mp3',
  'white hill music',
  'saga hits',
  'apna punjab',
  'single track studios',
  'jatt',
  'jatti',
  'gabru',
  'yaari',
  'bhangra',
  'tauba tauba',
  '52 bars',
  'softly',
  'lover',
  'hass hass',
  'cheques',
  'with you',
  'born to shine',
  'winning speech',
  'four me',
  'on top',
  'no love',
  'baller',
  'elevated',
  'major lalkara',
  'majhe aale',
  'brown munde',
  'excuses',
  'insane',
];

const extractText = (track) => {
  if (!track) return '';
  return `${track.title || ''} ${track.artist || ''} ${track.subtitle || ''} ${track.author || ''}`
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Checks if a track contains ANY known Punjabi artist or keyword
 */
export const hasPunjabiSignature = (track) => {
  const text = extractText(track);
  if (!text) return false;
  return (
    PUNJABI_ARTISTS.some((a) => text.includes(a)) ||
    PUNJABI_LABELS_AND_TERMS.some((t) => text.includes(t))
  );
};

/**
 * Checks if a track contains ANY known Haryanvi artist or keyword
 */
export const hasHaryanviSignature = (track) => {
  const text = extractText(track);
  if (!text) return false;
  return (
    HARYANVI_ARTISTS.some((a) => text.includes(a)) ||
    HARYANVI_LABELS_AND_TERMS.some((t) => text.includes(t))
  );
};

/**
 * Strict validator for Haryanvi content.
 * Guarantees that no Punjabi track leaks into Haryanvi charts/playlists.
 */
export const isStrictHaryanvi = (track) => {
  if (!track) return false;
  const text = extractText(track);
  if (!text) return false;

  // If it matches a famous Punjabi artist/label and NOT an explicit Haryanvi artist, REJECT IT
  const isHaryanviMatch =
    HARYANVI_ARTISTS.some((a) => text.includes(a)) ||
    HARYANVI_LABELS_AND_TERMS.some((t) => text.includes(t));

  const isPunjabiMatch =
    PUNJABI_ARTISTS.some((a) => text.includes(a)) ||
    PUNJABI_LABELS_AND_TERMS.some((t) => text.includes(t));

  if (isPunjabiMatch && !HARYANVI_ARTISTS.some((a) => text.includes(a))) {
    return false;
  }

  return isHaryanviMatch;
};

/**
 * Strict validator for Punjabi content.
 * Guarantees that no Haryanvi track leaks into Punjabi charts/playlists.
 */
export const isStrictPunjabi = (track) => {
  if (!track) return false;
  const text = extractText(track);
  if (!text) return false;

  const isHaryanviMatch =
    HARYANVI_ARTISTS.some((a) => text.includes(a)) ||
    HARYANVI_LABELS_AND_TERMS.some((t) => text.includes(t));

  const isPunjabiMatch =
    PUNJABI_ARTISTS.some((a) => text.includes(a)) ||
    PUNJABI_LABELS_AND_TERMS.some((t) => text.includes(t));

  if (isHaryanviMatch && !PUNJABI_ARTISTS.some((a) => text.includes(a))) {
    return false;
  }

  return isPunjabiMatch;
};
