import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import MobileBottomNav from './components/MobileBottomNav';
import HomeView from './views/HomeView';
import GenresView from './views/GenresView';
import PopularView from './views/PopularView';
import TopView from './views/TopView';
import WatchlistView from './views/WatchlistView';
import DownloadsView from './views/DownloadsView';
import ZokoPlayer from './components/ZokoPlayer';
import AnimeDetailModal from './components/AnimeDetailModal';
import SearchModal from './components/SearchModal';
import {
  getContinueWatchingList,
  updateContinueWatching,
  removeContinueWatching,
  getWatchlist,
  toggleWatchlist,
  getPlayerConfig,
  savePlayerConfig,
  getSavedTheme,
  saveTheme,
  getDownloads,
  removeDownload,
  clearAllDownloads
} from './services/storage';
import { App as CapApp } from '@capacitor/app';
import { Smartphone, Download } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [activeAnime, setActiveAnime] = useState(null);
  const [activeEpisode, setActiveEpisode] = useState(1);
  const [activeTime, setActiveTime] = useState(0);
  const [detailAnime, setDetailAnime] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Settings & Storage states
  const [theme, setTheme] = useState(getSavedTheme());
  const [playerConfig, setPlayerConfig] = useState(getPlayerConfig());
  const [continueWatchingList, setContinueWatchingList] = useState(getContinueWatchingList());
  const [watchlist, setWatchlist] = useState(getWatchlist());
  const [downloads, setDownloads] = useState(getDownloads());

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
  }, [theme]);

  // Apply dynamic accent color
  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', playerConfig.accentColor);
    document.documentElement.style.setProperty('--accent-glow', `${playerConfig.accentColor}55`);
    document.documentElement.style.setProperty('--accent-soft', `${playerConfig.accentColor}18`);
    savePlayerConfig({ accentColor: playerConfig.accentColor });
  }, [playerConfig.accentColor]);

  // Hardware Back Button handling for Dedicated Android App
  useEffect(() => {
    let removeListener = null;

    const initBackButton = async () => {
      try {
        const handle = await CapApp.addListener('backButton', () => {
          if (isSearchOpen) {
            setIsSearchOpen(false);
          } else if (detailAnime) {
            setDetailAnime(null);
          } else if (currentView === 'player') {
            setCurrentView('home');
          } else if (currentView !== 'home') {
            setCurrentView('home');
          } else {
            CapApp.exitApp();
          }
        });
        removeListener = handle.remove;
      } catch (err) {
        // Ignored when running in standard web browser
      }
    };

    initBackButton();

    return () => {
      if (removeListener) removeListener();
    };
  }, [isSearchOpen, detailAnime, currentView]);

  // Global keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && document.activeElement.tagName !== 'INPUT')) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleWatchAnime = useCallback((anime, episode = 1, initialTime = 0) => {
    setActiveAnime(anime);
    setActiveEpisode(episode);
    setActiveTime(initialTime);
    setCurrentView('player');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleResumeWatching = useCallback((item, episode, time) => {
    setActiveAnime(item);
    setActiveEpisode(episode || 1);
    setActiveTime(time || 0);
    setCurrentView('player');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleProgressUpdate = useCallback((progressData) => {
    const updated = updateContinueWatching(progressData);
    setContinueWatchingList(updated);
  }, []);

  const handleRemoveContinueWatching = useCallback((id) => {
    const updated = removeContinueWatching(id);
    setContinueWatchingList(updated);
  }, []);

  const handleToggleWatchlist = useCallback((anime) => {
    const { list } = toggleWatchlist(anime);
    setWatchlist(list);
  }, []);

  const handleRemoveDownload = useCallback((animeId, episode) => {
    const updated = removeDownload(animeId, episode);
    setDownloads(updated);
  }, []);

  const handleClearAllDownloads = useCallback(() => {
    const updated = clearAllDownloads();
    setDownloads(updated);
  }, []);

  const isBookmarked = (id) => watchlist.some(item => item.id === id);

  return (
    <div className="app-container">
      {/* Global Navigation Bar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenSearch={() => setIsSearchOpen(true)}
        theme={theme}
        setTheme={setTheme}
        accentColor={playerConfig.accentColor}
        setAccentColor={(color) => setPlayerConfig(prev => ({ ...prev, accentColor: color }))}
        watchlistCount={watchlist.length}
        downloadsCount={downloads.length}
      />

      {/* Main Content Router */}
      <main className="main-content">
        {currentView === 'home' && (
          <HomeView
            continueWatchingList={continueWatchingList}
            onResumeWatching={handleResumeWatching}
            onRemoveContinueWatching={handleRemoveContinueWatching}
            onWatchAnime={handleWatchAnime}
            onViewDetails={(a) => setDetailAnime(a)}
          />
        )}

        {currentView === 'player' && activeAnime && (
          <ZokoPlayer
            anime={activeAnime}
            initialEpisode={activeEpisode}
            initialTime={activeTime}
            accentColor={playerConfig.accentColor}
            onBack={() => setCurrentView('home')}
            onViewDetails={(a) => setDetailAnime(a)}
            onProgressUpdate={handleProgressUpdate}
            onToggleWatchlist={handleToggleWatchlist}
            isBookmarked={isBookmarked(activeAnime.id)}
            onWatchAnime={handleWatchAnime}
            onAnimeChange={(newAnime, ep) => {
              setActiveAnime(newAnime);
              setActiveEpisode(ep || 1);
            }}
          />
        )}

        {currentView === 'genres' && (
          <GenresView
            onWatchAnime={handleWatchAnime}
            onViewDetails={(a) => setDetailAnime(a)}
          />
        )}

        {currentView === 'popular' && (
          <PopularView
            onWatchAnime={handleWatchAnime}
            onViewDetails={(a) => setDetailAnime(a)}
          />
        )}

        {currentView === 'top' && (
          <TopView
            onWatchAnime={handleWatchAnime}
            onViewDetails={(a) => setDetailAnime(a)}
          />
        )}

        {currentView === 'watchlist' && (
          <WatchlistView
            watchlist={watchlist}
            onWatchAnime={handleWatchAnime}
            onViewDetails={(a) => setDetailAnime(a)}
          />
        )}

        {currentView === 'downloads' && (
          <DownloadsView
            downloads={downloads}
            onWatchAnime={handleWatchAnime}
            onRemoveDownload={handleRemoveDownload}
            onClearAllDownloads={handleClearAllDownloads}
            onBrowseAnime={() => setCurrentView('home')}
          />
        )}
      </main>

      {/* Dedicated Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentView={currentView}
        setCurrentView={setCurrentView}
        watchlistCount={watchlist.length}
        downloadsCount={downloads.length}
      />

      {/* Anime Detail Modal */}
      {detailAnime && (
        <AnimeDetailModal
          anime={detailAnime}
          onClose={() => setDetailAnime(null)}
          onWatch={(a, ep) => {
            setDetailAnime(null);
            handleWatchAnime(a, ep || 1);
          }}
          onToggleWatchlist={handleToggleWatchlist}
          isBookmarked={isBookmarked(detailAnime.id)}
        />
      )}

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectAnime={(anime) => setDetailAnime(anime)}
        onWatchAnime={(anime, ep) => handleWatchAnime(anime, ep || 1)}
      />

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-inner">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '1.15rem' }}>
              <span style={{ color: 'var(--accent-color)' }}>⚡ OTAKU</span>
              <span>PLAY</span>
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
              Dedicated anime streaming app with ZokoAnime adaptive engine & AniList metadata.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <a
              href="/assets/OtakuPlay.apk"
              download="OtakuPlay.apk"
              className="btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem' }}
              title="Download Dedicated Android App"
            >
              <Smartphone size={14} color="var(--accent-color)" />
              <span>Download APK</span>
            </a>

            <div className="footer-tags">
              <span>HLS Stream: Active</span>
              <span>Multi-Track: SUB / HSUB / DUB</span>
              <span>Offline: Supported</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
