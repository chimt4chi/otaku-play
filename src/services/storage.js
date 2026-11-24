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
    const existing = list.find(i => i.id === item.id);
    const filtered = list.filter(i => i.id !== item.id);
    const updated = {
      ...existing,
      ...item,
      // Retain or prioritize valid coverImage and bannerImage
      coverImage: item.coverImage || existing?.coverImage,
      bannerImage: item.bannerImage || existing?.bannerImage,
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

// Saved episodes (stored under the legacy "downloads" key). Components that save or remove
// episodes outside App (player, detail modal) rely on this event to keep counts in sync.
export const DOWNLOADS_CHANGED_EVENT = 'otaku:downloads-changed';
function notifyDownloadsChanged() {
  try {
    window.dispatchEvent(new Event(DOWNLOADS_CHANGED_EVENT));
  } catch {
    // Non-browser environment
  }
}

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
      status: 'saved'
    };
    const nextList = [updatedItem, ...filtered];
    localStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(nextList));
    notifyDownloadsChanged();
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
    notifyDownloadsChanged();
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
    notifyDownloadsChanged();
    return [];
  } catch (e) {
    return [];
  }
}
