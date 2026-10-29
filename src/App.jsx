import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HomeView from './views/HomeView';
import GenresView from './views/GenresView';
import PopularView from './views/PopularView';
import TopView from './views/TopView';
import WatchlistView from './views/WatchlistView';
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
  saveTheme
} from './services/storage';

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

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
  }, [theme]);

  // Apply dynamic accent color
  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', playerConfig.accentColor);
    // calculate subtle glow
    document.documentElement.style.setProperty('--accent-glow', `${playerConfig.accentColor}55`);
    document.documentElement.style.setProperty('--accent-soft', `${playerConfig.accentColor}18`);
    savePlayerConfig({ accentColor: playerConfig.accentColor });
  }, [playerConfig.accentColor]);

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

  const handleWatchAnime = (anime, episode = 1, initialTime = 0) => {
    setActiveAnime(anime);
    setActiveEpisode(episode);
    setActiveTime(initialTime);
    setCurrentView('player');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResumeWatching = (item, episode, time) => {
    setActiveAnime(item);
    setActiveEpisode(episode || 1);
    setActiveTime(time || 0);
    setCurrentView('player');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProgressUpdate = (progressData) => {
    const updated = updateContinueWatching(progressData);
    setContinueWatchingList(updated);
  };

  const handleRemoveContinueWatching = (id) => {
    const updated = removeContinueWatching(id);
    setContinueWatchingList(updated);
  };

  const handleToggleWatchlist = (anime) => {
    const { list } = toggleWatchlist(anime);
    setWatchlist(list);
  };

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
      </main>

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
      <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', padding: '2.5rem 1.5rem', marginTop: 'auto' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '1.2rem' }}>
              <span style={{ color: 'var(--accent-color)' }}>⚡ OTAKU</span>
              <span>STREAM</span>
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '0.4rem', fontFamily: 'var(--font-mono)' }}>
              Next-generation web player powered by ZokoAnime embed engine & AniList metadata.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span style={{ fontFamily: 'var(--font-mono)' }}>HLS Stream: Active</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>Multi-Track: SUB / HSUB / DUB</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>Auto-Skip: Supported</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
