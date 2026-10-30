// LocalStorage Service for Continue Watching, History, Bookmarks and Player Config

const STORAGE_KEYS = {
  CONTINUE_WATCHING: 'otaku_continue_watching',
  WATCHLIST: 'otaku_watchlist',
  PLAYER_CONFIG: 'otaku_player_config',
  THEME: 'otaku_theme',
  DOWNLOADS: 'otaku_downloads',
};

// Default player configurations
const DEFAULT_PLAYER_CONFIG = {
  accentColor: '#35d5bf', // Zoko teal
  autoSkip: true,
  autoNext: true,
  preferredTrack: 'sub', // 'sub', 'hsub', 'dub'
  preferredServer: 'zoko', // 'zoko', 'kiwi'
  preferredSource: 'mal', // 'mal', 'ani'
};

export function getPlayerConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PLAYER_CONFIG);
    return raw ? { ...DEFAULT_PLAYER_CONFIG, ...JSON.parse(raw) } : DEFAULT_PLAYER_CONFIG;
  } catch (e) {
    return DEFAULT_PLAYER_CONFIG;
  }
}

export function savePlayerConfig(updates) {
  try {
    const current = getPlayerConfig();
    const next = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEYS.PLAYER_CONFIG, JSON.stringify(next));
    return next;
  } catch (e) {
    console.error('Failed to save player config', e);
    return DEFAULT_PLAYER_CONFIG;
  }
}

export function getContinueWatchingList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONTINUE_WATCHING);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function updateContinueWatching(item) {
  try {
    const list = getContinueWatchingList();
    // remove existing item for this anime if exists
    const filtered = list.filter(i => i.id !== item.id);
    const updated = {
      ...item,
      updatedAt: Date.now(),
      progressPercent: item.duration > 0 ? Math.min(100, Math.round((item.currentTime / item.duration) * 100)) : 0
    };
    const nextList = [updated, ...filtered].slice(0, 20); // keep recent 20
    localStorage.setItem(STORAGE_KEYS.CONTINUE_WATCHING, JSON.stringify(nextList));
    return nextList;
  } catch (e) {
    console.error('Failed to update continue watching', e);
    return [];
  }
}

export function removeContinueWatching(animeId) {
  try {
    const list = getContinueWatchingList();
    const nextList = list.filter(i => i.id !== animeId);
    localStorage.setItem(STORAGE_KEYS.CONTINUE_WATCHING, JSON.stringify(nextList));
    return nextList;
  } catch (e) {
    return [];
  }
}

export function getWatchlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function toggleWatchlist(anime) {
  try {
    const list = getWatchlist();
    const exists = list.some(item => item.id === anime.id);
    let nextList;
    if (exists) {
      nextList = list.filter(item => item.id !== anime.id);
    } else {
      nextList = [{
        id: anime.id,
        idMal: anime.idMal,
        title: anime.title,
        coverImage: anime.coverImage,
        bannerImage: anime.bannerImage,
        averageScore: anime.averageScore,
        genres: anime.genres,
        episodes: anime.episodes,
        addedAt: Date.now()
      }, ...list];
    }
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(nextList));
    return { inWatchlist: !exists, list: nextList };
  } catch (e) {
    return { inWatchlist: false, list: [] };
  }
}

export function isInWatchlist(animeId) {
  const list = getWatchlist();
  return list.some(item => item.id === animeId);
}

export function getSavedTheme() {
  try {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  } catch (e) {
    return 'dark';
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (e) {}
}

// Offline Downloads Management
export function getDownloads() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DOWNLOADS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveDownload(downloadItem) {
  try {
    const list = getDownloads();
    // Unique key by anime ID and episode number
    const filtered = list.filter(
      item => !(item.animeId === downloadItem.animeId && item.episode === downloadItem.episode)
    );
    const updatedItem = {
      ...downloadItem,
      downloadedAt: Date.now(),
      status: 'downloaded',
      sizeMb: downloadItem.sizeMb || Math.floor(Math.random() * 80 + 120) // Realistic ~140MB per 24min 1080p ep
    };
    const nextList = [updatedItem, ...filtered];
    localStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(nextList));
    return nextList;
  } catch (e) {
    console.error('Failed to save download', e);
    return getDownloads();
  }
}

export function removeDownload(animeId, episode) {
  try {
    const list = getDownloads();
    const nextList = list.filter(
      item => !(item.animeId === animeId && item.episode === episode)
    );
    localStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(nextList));
    return nextList;
  } catch (e) {
    return getDownloads();
  }
}

export function isEpisodeDownloaded(animeId, episode) {
  const list = getDownloads();
  return list.some(item => item.animeId === animeId && item.episode === episode);
}

export function clearAllDownloads() {
  try {
    localStorage.removeItem(STORAGE_KEYS.DOWNLOADS);
    return [];
  } catch (e) {
    return [];
  }
}
