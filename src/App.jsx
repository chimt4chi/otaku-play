import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import MobileBottomNav from './components/MobileBottomNav';
import HomeView from './views/HomeView';
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
import { Capacitor } from '@capacitor/core';
import { Smartphone } from 'lucide-react';
import { checkForAppUpdate } from './services/otaService';

// Everything except the home screen is split out of the initial bundle
const GenresView = lazy(() => import('./views/GenresView'));
const PopularView = lazy(() => import('./views/PopularView'));
const TopView = lazy(() => import('./views/TopView'));
const WatchlistView = lazy(() => import('./views/WatchlistView'));
const DownloadsView = lazy(() => import('./views/DownloadsView'));
const ZokoPlayer = lazy(() => import('./components/ZokoPlayer'));
const AnimeDetailModal = lazy(() => import('./components/AnimeDetailModal'));
const SearchModal = lazy(() => import('./components/SearchModal'));
const OtaUpdateModal = lazy(() => import('./components/OtaUpdateModal'));

const isNativeApp = Capacitor.isNativePlatform();

function ViewFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 1rem' }} role="status" aria-label="Loading">
      <div className="player-spinner" />
    </div>
  );
}

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

  // Over-The-Air Update States
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  // Background OTA update check on startup
  useEffect(() => {
    let isMounted = true;
    const runUpdateCheck = async () => {
      try {
        const result = await checkForAppUpdate(false);
        if (isMounted && result?.hasUpdate) {
          setUpdateInfo(result);
          if (!result.isDismissed) {
            setIsUpdateModalOpen(true);
          }
        }
      } catch (err) {
        // Silently ignore background check errors
      }
    };

    const timer = setTimeout(runUpdateCheck, 2000);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  const handleCheckForUpdates = useCallback(async () => {
    setCheckingUpdate(true);
    try {
      const result = await checkForAppUpdate(true);
      if (result?.hasUpdate) {
        setUpdateInfo(result);
        setIsUpdateModalOpen(true);
      } else {
        alert(`You're already using the latest version of OtakuPlay (v${result?.currentVersion || '1.0.0'})!`);
      }
    } catch (err) {
      alert('Could not check updates. Please check your internet connection.');
    } finally {
      setCheckingUpdate(false);
    }
  }, []);

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

  // Always start a new screen at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView]);

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
    <div className={`app-container view-${currentView}`}>
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
        updateInfo={updateInfo}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
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
            onNavigate={setCurrentView}
          />
        )}

        <Suspense fallback={<ViewFallback />}>
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
            updateInfo={updateInfo}
            onCheckUpdates={handleCheckForUpdates}
            onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
            checkingUpdate={checkingUpdate}
          />
        )}
        </Suspense>
      </main>

      {/* Dedicated Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentView={currentView}
        setCurrentView={setCurrentView}
        watchlistCount={watchlist.length}
        downloadsCount={downloads.length}
      />

      <Suspense fallback={null}>
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
        {isSearchOpen && (
          <SearchModal
            isOpen
            onClose={() => setIsSearchOpen(false)}
            onSelectAnime={(anime) => setDetailAnime(anime)}
            onWatchAnime={(anime, ep) => handleWatchAnime(anime, ep || 1)}
          />
        )}

        {/* Over-The-Air Update Modal */}
        {isUpdateModalOpen && updateInfo && (
          <OtaUpdateModal
            updateInfo={updateInfo}
            onClose={() => setIsUpdateModalOpen(false)}
            onUpdateComplete={() => setIsUpdateModalOpen(false)}
          />
        )}
      </Suspense>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-inner">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '1.15rem' }}>
              <span style={{ color: 'var(--accent-color)' }}>⚡ OTAKU</span>
              <span>PLAY</span>
            </div>
            {/* <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
              Dedicated anime streaming app with ZokoAnime adaptive engine & AniList metadata.
            </p> */}
          </div>

          <div className="footer-actions">
            {!isNativeApp && (
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
            )}

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
