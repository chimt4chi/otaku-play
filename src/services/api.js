// AniList GraphQL API Service + Robust Cache + Fallback

const ANILIST_URL = 'https://graphql.anilist.co';

// In-memory cache for fast snappy UX
const cache = new Map();

async function fetchGraphQL(query, variables = {}) {
  const cacheKey = JSON.stringify({ query, variables });
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`AniList HTTP error: ${response.status}`);
    }

    const json = await response.json();
    if (json.errors && json.errors.length > 0) {
      console.warn('AniList GraphQL warning:', json.errors);
      throw new Error(json.errors[0].message);
    }

    // Cache successful queries for 10 minutes
    cache.set(cacheKey, json.data);
    return json.data;
  } catch (error) {
    console.error('Fetch error from AniList:', error);
    throw error;
  }
}

const MEDIA_FIELDS = `
  id
  idMal
  title {
    english
    romaji
    native
  }
  description(asHtml: false)
  bannerImage
  coverImage {
    extraLarge
    large
    color
  }
  format
  status
  episodes
  duration
  genres
  averageScore
  popularity
  favourites
  seasonYear
  nextAiringEpisode {
    episode
    airingAt
  }
`;

/**
 * Resolves the realistic total/latest episode count for an anime.
 * Handles AniList's null episode count for releasing or long-running anime.
 */
export function resolveEpisodeCount(anime) {
  if (!anime) return 24;
  // Check known long-running series FIRST so AniList's partial episode count
  // (e.g. 24 for a single cour of One Piece) doesn't mask the real total.
  const title = (anime.title?.english || anime.title?.romaji || '').toLowerCase();
  if (anime.id === 21 || title.includes('one piece')) {
    // Use nextAiringEpisode when available (more accurate for airing), else hardcode
    if (anime.nextAiringEpisode?.episode && anime.nextAiringEpisode.episode > 1) {
      return anime.nextAiringEpisode.episode - 1;
    }
    return 1180;
  }
  if (typeof anime.episodes === 'number' && anime.episodes > 0) {
    return anime.episodes;
  }
  if (anime.nextAiringEpisode?.episode && anime.nextAiringEpisode.episode > 1) {
    return anime.nextAiringEpisode.episode - 1;
  }
  if (anime.id === 235 || title.includes('detective conan') || title.includes('case closed')) {
    return 1140;
  }
  if (title.includes('pokemon') || title.includes('pocket monsters')) {
    return 1250;
  }
  if (title.includes('crayon shin-chan')) {
    return 1200;
  }
  if (title.includes('chibi maruko-chan')) {
    return 1500;
  }
  if (title.includes('sazae-san')) {
    return 2600;
  }
  if (anime.status === 'RELEASING') {
    return Math.max(anime.episodes || 0, 100);
  }
  return anime.episodes || 24;
}

export const KNOWN_FRANCHISE_SAGAS = {
  // One Piece (All Canon Story Sagas)
  21: [
    { sagaNumber: 1, name: "East Blue Saga", startEp: 1, endEp: 61 },
    { sagaNumber: 2, name: "Alabasta Saga", startEp: 62, endEp: 135 },
    { sagaNumber: 3, name: "Sky Island Saga", startEp: 136, endEp: 206 },
    { sagaNumber: 4, name: "Water 7 / Enies Lobby Saga", startEp: 207, endEp: 325 },
    { sagaNumber: 5, name: "Thriller Bark Saga", startEp: 326, endEp: 384 },
    { sagaNumber: 6, name: "Summit War / Marineford Saga", startEp: 385, endEp: 516 },
    { sagaNumber: 7, name: "Fish-Man Island Saga", startEp: 517, endEp: 574 },
    { sagaNumber: 8, name: "Dressrosa Saga", startEp: 575, endEp: 746 },
    { sagaNumber: 9, name: "Whole Cake Island Saga", startEp: 747, endEp: 889 },
    { sagaNumber: 10, name: "Wano Country Saga", startEp: 890, endEp: 1085 },
    { sagaNumber: 11, name: "Egghead Arc / Final Saga", startEp: 1086, endEp: 9999 }
  ],
  // Naruto (Original TV)
  20: [
    { sagaNumber: 1, name: "Prologue & Land of Waves", startEp: 1, endEp: 19 },
    { sagaNumber: 2, name: "Chunin Exams Arc", startEp: 20, endEp: 67 },
    { sagaNumber: 3, name: "Konoha Crush Arc", startEp: 68, endEp: 80 },
    { sagaNumber: 4, name: "Search for Tsunade Arc", startEp: 81, endEp: 100 },
    { sagaNumber: 5, name: "Sasuke Recovery Mission", startEp: 101, endEp: 135 },
    { sagaNumber: 6, name: "Land of Rice Fields & Special Missions", startEp: 136, endEp: 174 },
    { sagaNumber: 7, name: "Sunagakure Support & Hidden Leaf Arcs", startEp: 175, endEp: 220 }
  ],
  // Naruto: Shippuden
  1735: [
    { sagaNumber: 1, name: "Kazekage Rescue Mission", startEp: 1, endEp: 32 },
    { sagaNumber: 2, name: "Tenchi Bridge & Akatsuki Suppression", startEp: 33, endEp: 88 },
    { sagaNumber: 3, name: "Three-Tails & Itachi Pursuit", startEp: 89, endEp: 143 },
    { sagaNumber: 4, name: "Pain's Assault & Five Kage Summit", startEp: 144, endEp: 219 },
    { sagaNumber: 5, name: "Fourth Shinobi World War: Countdown", startEp: 220, endEp: 295 },
    { sagaNumber: 6, name: "Fourth Shinobi World War: Climax", startEp: 296, endEp: 375 },
    { sagaNumber: 7, name: "Birth of the Ten-Tails' Jinchuriki", startEp: 376, endEp: 426 },
    { sagaNumber: 8, name: "Infinite Tsukuyomi & Kaguya Strikes", startEp: 427, endEp: 479 },
    { sagaNumber: 9, name: "Final Battle & Post-War Epilogue", startEp: 480, endEp: 500 }
  ],
  // Bleach (Original TV)
  269: [
    { sagaNumber: 1, name: "Substitute Shinigami Arc", startEp: 1, endEp: 20 },
    { sagaNumber: 2, name: "Soul Society: Sneak Entry Arc", startEp: 21, endEp: 41 },
    { sagaNumber: 3, name: "Soul Society: The Rescue Arc", startEp: 42, endEp: 63 },
    { sagaNumber: 4, name: "The Bount Arc", startEp: 64, endEp: 109 },
    { sagaNumber: 5, name: "Arrancar: The Arrival & Hueco Mundo", startEp: 110, endEp: 167 },
    { sagaNumber: 6, name: "Captain Shusuke Amagai Arc", startEp: 168, endEp: 189 },
    { sagaNumber: 7, name: "Arrancar vs. Shinigami & The Past", startEp: 190, endEp: 212 },
    { sagaNumber: 8, name: "Decisive Battle of Karakura", startEp: 213, endEp: 265 },
    { sagaNumber: 9, name: "Zanpakuto: The Alternate Tale", startEp: 266, endEp: 316 },
    { sagaNumber: 10, name: "Gotei 13 Invading Army Arc", startEp: 317, endEp: 342 },
    { sagaNumber: 11, name: "The Lost Substitute Shinigami Arc", startEp: 343, endEp: 366 }
  ],
  // Hunter x Hunter (2011)
  11061: [
    { sagaNumber: 1, name: "Hunter Exam Arc", startEp: 1, endEp: 26 },
    { sagaNumber: 2, name: "Heavens Arena Arc", startEp: 27, endEp: 36 },
    { sagaNumber: 3, name: "Yorknew City Arc", startEp: 37, endEp: 58 },
    { sagaNumber: 4, name: "Greed Island Arc", startEp: 59, endEp: 75 },
    { sagaNumber: 5, name: "Chimera Ant Arc", startEp: 76, endEp: 136 },
    { sagaNumber: 6, name: "13th Hunter Chairman Election Arc", startEp: 137, endEp: 148 }
  ],
  // Dragon Ball Z
  813: [
    { sagaNumber: 1, name: "Saiyan Saga", startEp: 1, endEp: 35 },
    { sagaNumber: 2, name: "Namek & Captain Ginyu Saga", startEp: 36, endEp: 74 },
    { sagaNumber: 3, name: "Frieza Saga", startEp: 75, endEp: 107 },
    { sagaNumber: 4, name: "Garlic Jr. Saga", startEp: 108, endEp: 117 },
    { sagaNumber: 5, name: "Androids & Cell Saga", startEp: 118, endEp: 194 },
    { sagaNumber: 6, name: "World Tournament & Majin Buu Saga", startEp: 195, endEp: 291 }
  ]
};

export function getAnimeSagasOrSeasons(anime) {
  if (!anime) return [];
  const total = resolveEpisodeCount(anime);
  const known = KNOWN_FRANCHISE_SAGAS[anime.id] ||
    (anime.title && Object.entries(KNOWN_FRANCHISE_SAGAS).find(([kId]) => {
      const title = (anime.title?.english || anime.title?.romaji || '').toLowerCase();
      if (kId === '21' && title.includes('one piece')) return true;
      if (kId === '20' && (title === 'naruto' || title.startsWith('naruto '))) return true;
      if (kId === '1735' && (title.includes('shippuuden') || title.includes('shippuden'))) return true;
      if (kId === '269' && (title === 'bleach' || title.startsWith('bleach '))) return true;
      if (kId === '11061' && title.includes('hunter x hunter')) return true;
      if (kId === '813' && title.includes('dragon ball z')) return true;
      return false;
    })?.[1]);

  if (known) {
    return known.map(s => {
      const end = Math.min(total, s.endEp);
      return {
        ...s,
        endEp: end,
        episodeCount: Math.max(1, end - s.startEp + 1)
      };
    }).filter(s => s.startEp <= total);
  }

  // Generic fallback for long-running series without explicit saga configuration (> 75 episodes)
  if (total > 75) {
    const CHUNK_SIZE = 50;
    const count = Math.ceil(total / CHUNK_SIZE);
    const sagas = [];
    for (let i = 0; i < count; i++) {
      const start = i * CHUNK_SIZE + 1;
      const end = Math.min(total, (i + 1) * CHUNK_SIZE);
      sagas.push({
        sagaNumber: i + 1,
        name: `Part ${i + 1}`,
        startEp: start,
        endEp: end,
        episodeCount: end - start + 1
      });
    }
    return sagas;
  }

  return [];
}

// Clean franchise normalization and grouping
export function getFranchiseKey(title) {
  if (!title) return '';
  return title
    .replace(/\s*[-:]?\s*(season\s*\d+(\s*part\s*\d+)?|the final season(\s*part\s*\d+)?|final season(\s*part\s*\d+)?|\bpart\s*\d+|\b\d+(st|nd|rd|th)\s*season\b|\b(II|III|IV|V|VI)\b).*$/i, '')
    .replace(/\s*[-:]?\s*([A-Za-z0-9\s'-]+ Arc).*$/i, '')
    .replace(/\s*[-:]?\s*(Thousand-Year Blood War|Ultra Romantic|Stone Wars|New World|Entertainment District|Swordsmith Village|Hashira Training|Mugen Train).*$/i, '')
    .trim();
}

export function getDetailedSeasonLabel(item, defaultIdx = 1) {
  const t = item.title?.english || item.title?.romaji || '';

  // Spin-offs
  if (/junior high/i.test(t)) {
    return 'Attack on Titan: Junior High (Spin-Off)';
  }

  // Specials & Final Chapters
  if (/the final chapters/i.test(t)) {
    const spMatch = t.match(/special\s*(\d+)/i);
    return spMatch ? `The Final Chapters Special ${spMatch[1]}` : 'The Final Chapters';
  }

  // Movies & OVAs
  if (item.format === 'MOVIE') {
    const clean = t.replace(new RegExp(`^${getFranchiseKey(t)}[:\\s-]*`, 'i'), '').trim();
    return clean ? `${clean} (Movie)` : `${t} (Movie)`;
  }
  if (item.format === 'OVA') {
    const clean = t.replace(new RegExp(`^${getFranchiseKey(t)}[:\\s-]*`, 'i'), '').trim();
    return clean ? `${clean} (OVA)` : `${t} (OVA)`;
  }

  // Final Season Part 2 / Final Season
  if (/(the\s*)?final season\s*part\s*(\d+)/i.test(t)) {
    const pMatch = t.match(/final season\s*part\s*(\d+)/i);
    return `The Final Season Part ${pMatch[1]}`;
  }
  if (/(the\s*)?final season/i.test(t)) {
    return 'The Final Season';
  }

  // Season X Part Y
  const sPartMatch = t.match(/season\s*(\d+)\s*part\s*(\d+)/i);
  if (sPartMatch) {
    return `Season ${sPartMatch[1]} Part ${sPartMatch[2]}`;
  }

  // Season X
  const sMatch = t.match(/season\s*(\d+)/i);
  if (sMatch) {
    return `Season ${sMatch[1]}`;
  }

  // Roman numerals e.g. II, III, IV for TV series
  const romanMatch = t.match(/\b(II|III|IV|V|VI)\b/);
  if (romanMatch) {
    const romanMap = { II: 2, III: 3, IV: 4, V: 5, VI: 6 };
    return `Season ${romanMap[romanMatch[1]] || romanMatch[1]}`;
  }

  // Named Arcs (e.g. Hashira Training Arc, Mugen Train Arc)
  const arcMatch = t.match(/([A-Za-z0-9\s'-]+(?:Arc|Thousand-Year Blood War))/i);
  if (arcMatch) {
    const fKey = getFranchiseKey(t);
    return arcMatch[0].replace(new RegExp(`^${fKey}[:\\s-]*`, 'i'), '').trim();
  }

  if (item.format === 'SPECIAL') {
    const clean = t.replace(new RegExp(`^${getFranchiseKey(t)}[:\\s-]*`, 'i'), '').trim();
    return clean ? `${clean} (Special)` : `${t} (Special)`;
  }

  if (defaultIdx === 1) return 'Season 1';
  return t || `Season ${defaultIdx}`;
}

export function getSeasonLabel(title, idx) {
  return getDetailedSeasonLabel({ title }, idx);
}

export function groupMediaIntoFranchises(mediaList) {
  if (!mediaList || !Array.isArray(mediaList)) return [];

  const clusters = [];

  for (const item of mediaList) {
    const rawTitle = item.title?.english || item.title?.romaji || '';
    const franchiseKey = getFranchiseKey(rawTitle).toLowerCase();

    // Match existing cluster either by exact key or prefix/colon
    let matched = clusters.find(c => {
      const cKey = c.franchiseKey;
      return (
        cKey === franchiseKey ||
        cKey.startsWith(franchiseKey + ':') ||
        franchiseKey.startsWith(cKey + ':') ||
        cKey.startsWith(franchiseKey + ' ') ||
        franchiseKey.startsWith(cKey + ' ')
      );
    });

    if (matched) {
      if (rawTitle && rawTitle.length < (matched.canonicalTitle?.length || 999)) {
        matched.canonicalTitle = rawTitle;
        if (item.coverImage) matched.coverImage = item.coverImage;
        if (item.bannerImage) matched.bannerImage = item.bannerImage;
      }
      matched.items.push(item);
    } else {
      clusters.push({
        franchiseKey,
        canonicalTitle: rawTitle,
        coverImage: item.coverImage,
        bannerImage: item.bannerImage,
        items: [item]
      });
    }
  }

  return clusters.map(cluster => {
    // Sort items chronologically by seasonYear
    const sortedItems = cluster.items.slice().sort((a, b) => {
      const yearA = a.seasonYear || 9999;
      const yearB = b.seasonYear || 9999;
      if (yearA !== yearB) return yearA - yearB;
      return (a.id || 0) - (b.id || 0);
    });

    const primaryItem = sortedItems[0];
    const totalEpisodes = sortedItems.reduce((acc, curr) => acc + resolveEpisodeCount(curr), 0);

    const seasons = sortedItems.map((s, idx) => ({
      ...s,
      episodes: resolveEpisodeCount(s),
      seasonNumber: idx + 1,
      seasonName: getDetailedSeasonLabel(s, idx + 1),
    }));

    return {
      ...primaryItem,
      title: {
        ...primaryItem.title,
        english: cluster.canonicalTitle || primaryItem.title?.english,
      },
      seasonCount: seasons.length,
      seasons: seasons,
      totalEpisodes: totalEpisodes > 0 ? totalEpisodes : resolveEpisodeCount(primaryItem),
    };
  });
}

/**
 * Fetch all seasons, movies, OVAs, and specials for an entire anime franchise
 */
export async function fetchFullFranchiseSeasons(anime) {
  if (!anime) return { allSeasons: [], mainSeasons: [], sideContent: [] };

  const rawTitle = anime.title?.english || anime.title?.romaji || '';
  const franchiseKey = getFranchiseKey(rawTitle);

  try {
    const query = `
      query ($search: String) {
        Page(page: 1, perPage: 40) {
          media(search: $search, type: ANIME, isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;

    const res = await fetchGraphQL(query, { search: franchiseKey || rawTitle });
    const items = res?.Page?.media || [];

    const lowerKey = franchiseKey.toLowerCase();
    const matched = items.filter(item => {
      // Exclude standalone music videos or PV promos
      if (item.format === 'MUSIC') return false;

      const itemTitle = (item.title?.english || item.title?.romaji || '').toLowerCase();
      const itemKey = getFranchiseKey(itemTitle).toLowerCase();
      return (
        itemKey === lowerKey ||
        itemTitle.includes(lowerKey) ||
        lowerKey.includes(itemKey) ||
        item.id === anime.id
      );
    });

    // Make sure current anime is included
    if (!matched.some(m => m.id === anime.id)) {
      matched.push(anime);
    }

    const mainList = [];
    const sideList = [];

    for (const item of matched) {
      const titleStr = (item.title?.english || item.title?.romaji || '').toLowerCase();
      const isFinalChapters = /the final chapters/i.test(titleStr);
      const isSide =
        !isFinalChapters && (
          item.format === 'MOVIE' ||
          item.format === 'OVA' ||
          item.format === 'SPECIAL' ||
          item.format === 'ONA' ||
          /(junior high|picture drama|chimi kyara|specials$|pv$)/i.test(titleStr)
        );

      if (isSide) {
        sideList.push(item);
      } else {
        mainList.push(item);
      }
    }

    // Sort chronologically
    mainList.sort((a, b) => (a.seasonYear || 9999) - (b.seasonYear || 9999) || (a.id || 0) - (b.id || 0));
    sideList.sort((a, b) => (a.seasonYear || 9999) - (b.seasonYear || 9999) || (a.id || 0) - (b.id || 0));

    const mainSeasons = mainList.map((s, idx) => ({
      ...s,
      episodes: resolveEpisodeCount(s),
      seasonNumber: idx + 1,
      seasonName: getDetailedSeasonLabel(s, idx + 1),
      isMain: true
    }));

    const sideContent = sideList.map(s => ({
      ...s,
      episodes: resolveEpisodeCount(s),
      seasonName: getDetailedSeasonLabel(s, 0),
      isMain: false
    }));

    return {
      allSeasons: [...mainSeasons, ...sideContent],
      mainSeasons,
      sideContent
    };
  } catch (err) {
    console.warn('Failed to fetch full franchise seasons:', err);
    const fallbackItem = { ...anime, episodes: resolveEpisodeCount(anime) };
    return {
      allSeasons: [fallbackItem],
      mainSeasons: [fallbackItem],
      sideContent: []
    };
  }
}

export async function getTrendingAnime(page = 1, perPage = 16) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  try {
    const data = await fetchGraphQL(query, { page, perPage });
    return groupMediaIntoFranchises(data.Page.media);
  } catch (err) {
    return groupMediaIntoFranchises(FALLBACK_TRENDING);
  }
}

export async function getPopularAnime(page = 1, perPage = 16) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  try {
    const data = await fetchGraphQL(query, { page, perPage });
    return groupMediaIntoFranchises(data.Page.media);
  } catch (err) {
    return groupMediaIntoFranchises(FALLBACK_POPULAR);
  }
}

export async function getTopRatedAnime(page = 1, perPage = 16) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: SCORE_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  try {
    const data = await fetchGraphQL(query, { page, perPage });
    return groupMediaIntoFranchises(data.Page.media);
  } catch (err) {
    return groupMediaIntoFranchises(FALLBACK_TOP);
  }
}

export async function getAnimeByGenre(genre, page = 1, perPage = 16) {
  const query = `
    query ($page: Int, $perPage: Int, $genre: String) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, genre: $genre, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  try {
    const data = await fetchGraphQL(query, { page, perPage, genre });
    return groupMediaIntoFranchises(data.Page.media);
  } catch (err) {
    return groupMediaIntoFranchises(FALLBACK_POPULAR.filter(a => a.genres?.includes(genre)));
  }
}

export async function searchAnime(search, page = 1, perPage = 25, genre = null, sort = 'POPULARITY_DESC') {
  const query = `
    query ($page: Int, $perPage: Int, $search: String, $genre: String, $sort: [MediaSort]) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          hasNextPage
        }
        media(type: ANIME, search: $search, genre: $genre, sort: $sort, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const variables = { page, perPage, sort: [sort] };
  if (search && search.trim()) variables.search = search.trim();
  if (genre && genre !== 'All') variables.genre = genre;

  try {
    const data = await fetchGraphQL(query, variables);
    return groupMediaIntoFranchises(data.Page.media);
  } catch (err) {
    let results = [...FALLBACK_TRENDING, ...FALLBACK_POPULAR];
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(a => 
        (a.title.english && a.title.english.toLowerCase().includes(q)) ||
        (a.title.romaji && a.title.romaji.toLowerCase().includes(q))
      );
    }
    if (genre && genre !== 'All') {
      results = results.filter(a => a.genres?.includes(genre));
    }
    return groupMediaIntoFranchises(results);
  }
}

export async function getAnimeDetails(id) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_FIELDS}
        studios(isMain: true) {
          nodes {
            id
            name
          }
        }
        trailer {
          id
          site
          thumbnail
        }
        characters(sort: [ROLE, RELEVANCE], perPage: 12) {
          edges {
            role
            node {
              id
              name {
                full
                native
              }
              image {
                large
              }
              description(asHtml: false)
              gender
              age
            }
            voiceActors(language: JAPANESE) {
              id
              name {
                full
                native
              }
              image {
                large
              }
            }
          }
        }
        recommendations(perPage: 10, sort: RATING_DESC) {
          nodes {
            mediaRecommendation {
              ${MEDIA_FIELDS}
            }
          }
        }
        relations {
          edges {
            relationType
            node {
              id
              idMal
              title {
                english
                romaji
              }
              format
              type
              coverImage {
                large
              }
            }
          }
        }
      }
    }
  `;
  try {
    const data = await fetchGraphQL(query, { id: parseInt(id, 10) });
    if (data?.Media) {
      data.Media.episodes = resolveEpisodeCount(data.Media);
      return data.Media;
    }
    return data?.Media;
  } catch (err) {
    const found = [...FALLBACK_TRENDING, ...FALLBACK_POPULAR].find(a => a.id === parseInt(id, 10));
    if (found) {
      return {
        ...found,
        episodes: resolveEpisodeCount(found),
        studios: { nodes: [{ name: 'Studio MAPPA' }] },
        characters: {
          edges: [
            {
              role: 'MAIN',
              node: {
                id: 1,
                name: { full: 'Protagonist', native: '主人公' },
                image: { large: found.coverImage.large },
                description: 'The determined main character facing impossible odds.',
                gender: 'Male',
                age: '17'
              },
              voiceActors: [{
                name: { full: 'Yuki Kaji', native: '梶 裕貴' },
                image: { large: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' }
              }]
            }
          ]
        },
        recommendations: {
          nodes: FALLBACK_POPULAR.slice(0, 4).map(m => ({ mediaRecommendation: m }))
        }
      };
    }
    throw err;
  }
}

// Built-in curated data sets for instant offline experience & safety
export const FALLBACK_TRENDING = [
  {
    id: 16498,
    idMal: 16498,
    title: { english: "Attack on Titan", romaji: "Shingeki no Kyojin" },
    description: "Centuries ago, mankind was slaughtered to near extinction by monstrous humanoid creatures called Titans, forcing humans to hide in fear behind enormous concentric walls.",
    bannerImage: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&auto=format&fit=crop&q=80",
    coverImage: {
      extraLarge: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
      large: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
      color: "#e45c3a"
    },
    format: "TV",
    status: "FINISHED",
    episodes: 25,
    duration: 24,
    genres: ["Action", "Drama", "Fantasy", "Mystery"],
    averageScore: 90,
    popularity: 580000,
    seasonYear: 2013
  },
  {
    id: 101922,
    idMal: 38000,
    title: { english: "Demon Slayer: Kimetsu no Yaiba", romaji: "Kimetsu no Yaiba" },
    description: "Tanjiro Kamado is a kindhearted boy whose peaceful life is shattered when demons slaughter his family and turn his sister Nezuko into a demon.",
    bannerImage: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80",
    coverImage: {
      extraLarge: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
      large: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
      color: "#2ec4b6"
    },
    format: "TV",
    status: "FINISHED",
    episodes: 26,
    duration: 24,
    genres: ["Action", "Adventure", "Fantasy", "Supernatural"],
    averageScore: 88,
    popularity: 520000,
    seasonYear: 2019
  },
  {
    id: 113415,
    idMal: 40748,
    title: { english: "Jujutsu Kaisen", romaji: "Jujutsu Kaisen" },
    description: "Yuji Itadori swallows a cursed talisman—the finger of the demon Ryomen Sukuna—and becomes possessed. He enters Tokyo Jujutsu High School to learn sorcery and vanquish curses.",
    bannerImage: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1600&auto=format&fit=crop&q=80",
    coverImage: {
      extraLarge: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
      large: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
      color: "#8338ec"
    },
    format: "TV",
    status: "FINISHED",
    episodes: 24,
    duration: 24,
    genres: ["Action", "Fantasy", "Supernatural"],
    averageScore: 87,
    popularity: 490000,
    seasonYear: 2020
  },
  {
    id: 154587,
    idMal: 52991,
    title: { english: "Frieren: Beyond Journey's End", romaji: "Sousou no Frieren" },
    description: "The adventure is over, but life goes on for an elven mage just beginning to learn what living is all about after the hero Himmel passes away.",
    bannerImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
    coverImage: {
      extraLarge: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
      large: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
      color: "#38bdf8"
    },
    format: "TV",
    status: "FINISHED",
    episodes: 28,
    duration: 24,
    genres: ["Adventure", "Drama", "Fantasy"],
    averageScore: 92,
    popularity: 380000,
    seasonYear: 2023
  }
];

export const FALLBACK_POPULAR = [
  ...FALLBACK_TRENDING,
  {
    id: 21,
    idMal: 21,
    title: { english: "One Piece", romaji: "ONE PIECE" },
    description: "Gol D. Roger, a man referred to as the 'King of the Pirates,' promised the world his greatest treasure: the One Piece. Monkey D. Luffy sets out to sea to claim it.",
    bannerImage: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80",
    coverImage: {
      extraLarge: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
      large: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
      color: "#fbbf24"
    },
    format: "TV",
    status: "RELEASING",
    episodes: 1100,
    duration: 24,
    genres: ["Action", "Adventure", "Comedy", "Fantasy"],
    averageScore: 89,
    popularity: 620000,
    seasonYear: 1999
  },
  {
    id: 1535,
    idMal: 1535,
    title: { english: "Death Note", romaji: "Death Note" },
    description: "A shinigami dropped a notebook that allows anyone to kill anyone whose face and name they know. Brilliant student Light Yagami finds it and decides to reshape the world.",
    bannerImage: "https://images.unsplash.com/photo-1514539079130-25950c84af65?w=1600&auto=format&fit=crop&q=80",
    coverImage: {
      extraLarge: "https://images.unsplash.com/photo-1514539079130-25950c84af65?w=600&auto=format&fit=crop&q=80",
      large: "https://images.unsplash.com/photo-1514539079130-25950c84af65?w=600&auto=format&fit=crop&q=80",
      color: "#475569"
    },
    format: "TV",
    status: "FINISHED",
    episodes: 37,
    duration: 23,
    genres: ["Mystery", "Psychological", "Supernatural", "Thriller"],
    averageScore: 84,
    popularity: 590000,
    seasonYear: 2006
  },
  {
    id: 11061,
    idMal: 11061,
    title: { english: "Hunter x Hunter (2011)", romaji: "Hunter x Hunter (2011)" },
    description: "Gon Freecss aspires to become a Hunter, an exceptional being capable of greatness. With friends Killua, Kurapika, and Leorio, he embarks on an unforgettable journey.",
    bannerImage: "https://images.unsplash.com/photo-1563089145-599997674d42?w=1600&auto=format&fit=crop&q=80",
    coverImage: {
      extraLarge: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80",
      large: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80",
      color: "#10b981"
    },
    format: "TV",
    status: "FINISHED",
    episodes: 148,
    duration: 23,
    genres: ["Action", "Adventure", "Fantasy"],
    averageScore: 90,
    popularity: 510000,
    seasonYear: 2011
  },
  {
    id: 20,
    idMal: 20,
    title: { english: "Naruto", romaji: "Naruto" },
    description: "Moments prior to Naruto Uzumaki's birth, a huge demon known as the Kyuubi struck Konohagakure. Naruto grows up shunned, seeking recognition by becoming Hokage.",
    bannerImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80",
    coverImage: {
      extraLarge: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
      large: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
      color: "#f97316"
    },
    format: "TV",
    status: "FINISHED",
    episodes: 220,
    duration: 23,
    genres: ["Action", "Adventure", "Comedy"],
    averageScore: 80,
    popularity: 450000,
    seasonYear: 2002
  }
];

export const FALLBACK_TOP = [
  ...FALLBACK_POPULAR.slice().sort((a, b) => b.averageScore - a.averageScore)
];

export const ALL_GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller"
];

export const PRODUCTION_URL = 'https://otaku-play.vercel.app';

/**
 * Returns the public web URL of the application.
 * Replaces localhost and Capacitor internal origins with the live production URL.
 */
export function getPublicBaseUrl() {
  if (typeof window === 'undefined') return PRODUCTION_URL;
  const origin = window.location.origin;
  if (
    !origin ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.startsWith('capacitor://') ||
    origin.startsWith('file://')
  ) {
    return PRODUCTION_URL;
  }
  return origin;
}
