import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
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
  DOWNLOADS_CHANGED_EVENT,
  removeDownload,
  clearAllDownloads
} from './services/storage';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Smartphone } from 'lucide-react';
import { checkForAppUpdate, CURRENT_APP_VERSION } from './services/otaService';
import { watchPartyService } from './services/watchPartyService';
import { getAnimeDetails } from './services/api';
import { handleBackPress, useBackHandler } from './services/backStack';
import OfflineBanner from './components/OfflineBanner';
import TvSideNav from './tv/TvSideNav';
import TvHomeView from './tv/TvHomeView';
import { isTv } from './services/tv';

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
const WatchPartyModal = lazy(() => import('./components/WatchPartyModal'));

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

  // Watch Party States
  const [partyState, setPartyState] = useState({
    active: false,
    roomCode: null,
    isHost: false,
    members: [],
    messages: []
  });
  const [isPartyDrawerOpen, setIsPartyDrawerOpen] = useState(false);
  const [isWatchPartyModalOpen, setIsWatchPartyModalOpen] = useState(false);
  const [initialPartyCode, setInitialPartyCode] = useState('');

  // Deep link listener on startup: ?party=OTK-XXXX or ?watch=123&ep=1
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const party = params.get('party');
      if (party) {
        setInitialPartyCode(party);
        setIsWatchPartyModalOpen(true);
      }

      const watchId = params.get('watch');
      const epParam = params.get('ep');
      if (watchId) {
        const idNum = parseInt(watchId, 10);
        if (!isNaN(idNum)) {
          getAnimeDetails(idNum).then(anime => {
            if (anime) {
              setActiveAnime(anime);
              setActiveEpisode(parseInt(epParam, 10) || 1);
              setActiveTime(0);
              setCurrentView('player');
            }
          }).catch(err => {
            console.warn('Failed to load anime from deep link:', err);
          });
        }
      }
    } catch (e) {
      // Ignored
    }
  }, []);

  // Listen for Watch Party service events
  useEffect(() => {
    const unsubStatus = watchPartyService.on('status', (info) => {
      if (info.state === 'connected') {
        setPartyState(prev => ({
          ...prev,
          active: true,
          roomCode: info.roomCode,
          isHost: info.isHost
        }));
        setIsPartyDrawerOpen(true);
      } else if (info.state === 'idle' || info.state === 'disconnected') {
        setPartyState({
          active: false,
          roomCode: null,
          isHost: false,
          members: [],
          messages: []
        });
        setIsPartyDrawerOpen(false);
      }
    });

    const unsubMembers = watchPartyService.on('members', (members) => {
      setPartyState(prev => ({ ...prev, members }));
    });

    const unsubChat = watchPartyService.on('chat', (message) => {
      setPartyState(prev => ({
        ...prev,
        messages: [...prev.messages, message]
      }));
    });

    const unsubSync = watchPartyService.on('sync', async (syncData) => {
      if (!syncData?.animeId) return;

      // When guest is in party and sync indicates show or episode change
      if (!activeAnime || activeAnime.id !== syncData.animeId) {
        try {
          const fetched = await getAnimeDetails(syncData.animeId);
          if (fetched) {
            setActiveAnime(fetched);
            setActiveEpisode(syncData.episode || 1);
            setActiveTime(syncData.currentTime || 0);
            setCurrentView('player');
          }
        } catch (err) {
          console.warn('Failed to sync party anime:', err);
        }
      }
    });

    return () => {
      unsubStatus();
      unsubMembers();
      unsubChat();
      unsubSync();
    };
  }, [activeAnime]);

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
        alert(`You're already using the latest version of OtakuPlay (v${result?.currentVersion || CURRENT_APP_VERSION})!`);
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

  // Apply dynamic accent color + RGB channel for atmospheric gradients
  useEffect(() => {
    const hex = playerConfig.accentColor.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
      }
    }
    document.documentElement.style.setProperty('--accent-color', playerConfig.accentColor);
    document.documentElement.style.setProperty('--accent-glow', `${playerConfig.accentColor}44`);
    document.documentElement.style.setProperty('--accent-soft', `${playerConfig.accentColor}16`);
    savePlayerConfig({ accentColor: playerConfig.accentColor });
  }, [playerConfig.accentColor]);

  // Remember where the player was opened from so Back returns there
  const viewBeforePlayerRef = useRef('home');
  const previousViewRef = useRef('home');
  useEffect(() => {
    if (currentView === 'player' && previousViewRef.current !== 'player') {
      viewBeforePlayerRef.current = previousViewRef.current;
    }
    previousViewRef.current = currentView;
  }, [currentView]);

  useBackHandler(isSearchOpen, () => setIsSearchOpen(false));
  useBackHandler(Boolean(detailAnime), () => setDetailAnime(null));
  useBackHandler(isUpdateModalOpen && Boolean(updateInfo), () => setIsUpdateModalOpen(false));
  useBackHandler(isWatchPartyModalOpen, () => setIsWatchPartyModalOpen(false));

  // Saved episodes can change from the player / detail modal; keep the list and badges in sync
  useEffect(() => {
    const sync = () => setDownloads(getDownloads());
    window.addEventListener(DOWNLOADS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(DOWNLOADS_CHANGED_EVENT, sync);
  }, []);

  // Hardware Back Button handling for Dedicated Android App
  useEffect(() => {
    let removeListener = null;

    const initBackButton = async () => {
      try {
        const handle = await CapApp.addListener('backButton', () => {
          // Overlays register themselves (modals, drawers, fullscreen): topmost closes first
          if (handleBackPress()) return;
          if (currentView === 'player') {
            setCurrentView(viewBeforePlayerRef.current || 'home');
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
  }, [currentView]);

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

  const handleCreateParty = useCallback(async ({ username, avatarColor, anime, episode, currentTime }) => {
    const targetAnime = anime || activeAnime;
    if (!targetAnime) {
      throw new Error('Please select an anime before hosting a Watch Party.');
    }
    await watchPartyService.createRoom(
      username,
      targetAnime,
      episode || activeEpisode,
      currentTime || activeTime,
      avatarColor
    );
    if (currentView !== 'player') {
      setActiveAnime(targetAnime);
      setActiveEpisode(episode || 1);
      setActiveTime(currentTime || 0);
      setCurrentView('player');
    }
  }, [activeAnime, activeEpisode, activeTime, currentView]);

  const handleJoinParty = useCallback(async ({ roomCode, username, avatarColor }) => {
    await watchPartyService.joinRoom(roomCode, username, avatarColor);
    setTimeout(() => {
      watchPartyService.requestSync();
    }, 800);
  }, []);

  const handleLeaveParty = useCallback(() => {
    watchPartyService.leaveRoom();
    setPartyState({
      active: false,
      roomCode: null,
      isHost: false,
      members: [],
      messages: []
    });
    setIsPartyDrawerOpen(false);
  }, []);

  const isBookmarked = (id) => watchlist.some(item => item.id === id);

  return (
    <div className={`app-container view-${currentView}`}>
      <OfflineBanner />
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
        onCheckUpdates={handleCheckForUpdates}
        partyInfo={{
          active: partyState.active,
          roomCode: partyState.roomCode,
          membersCount: partyState.members.length
        }}
        onOpenPartyModal={() => setIsWatchPartyModalOpen(true)}
      />

      {isTv() && currentView !== 'player' && (
        <TvSideNav
          currentView={currentView}
          setCurrentView={setCurrentView}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenPartyModal={() => setIsWatchPartyModalOpen(true)}
        />
      )}

      {/* Main Content Router */}
      <main className="main-content">
        {currentView === 'home' && isTv() && (
          <TvHomeView
            continueWatchingList={continueWatchingList}
            onResumeWatching={handleResumeWatching}
            onViewDetails={(a) => setDetailAnime(a)}
          />
        )}

        {currentView === 'home' && !isTv() && (
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
            partyState={partyState}
            isPartyDrawerOpen={isPartyDrawerOpen}
            setIsPartyDrawerOpen={setIsPartyDrawerOpen}
            onOpenWatchPartyModal={() => setIsWatchPartyModalOpen(true)}
            onLeaveParty={handleLeaveParty}
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
        </Suspense>
      </main>

      {/* Dedicated Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentView={currentView}
        setCurrentView={setCurrentView}
        watchlistCount={watchlist.length}
        downloadsCount={downloads.length}
        partyInfo={{
          active: partyState.active,
          roomCode: partyState.roomCode,
          membersCount: partyState.members.length
        }}
        onOpenPartyModal={() => setIsWatchPartyModalOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
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

        {/* Watch Party Modal */}
        {isWatchPartyModalOpen && (
          <WatchPartyModal
            isOpen={isWatchPartyModalOpen}
            onClose={() => setIsWatchPartyModalOpen(false)}
            currentAnime={activeAnime}
            currentEpisode={activeEpisode}
            currentTime={activeTime}
            onCreateParty={handleCreateParty}
            onJoinParty={handleJoinParty}
            initialRoomCode={initialPartyCode}
          />
        )}
      </Suspense>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="footer-logo-accent">Otaku</span>
              <span>Play</span>
              <span className="footer-version-pill">v{CURRENT_APP_VERSION}</span>
            </div>
            <p className="footer-tagline">
              Adaptive HLS anime streaming with Watch Party sync & offline episode shortcuts.
            </p>
          </div>

          <nav className="footer-nav" aria-label="Footer Navigation">
            <button type="button" onClick={() => { setCurrentView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Home</button>
            <button type="button" onClick={() => { setCurrentView('genres'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Genres</button>
            <button type="button" onClick={() => { setCurrentView('popular'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Popular</button>
            <button type="button" onClick={() => { setCurrentView('top'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Top Rated</button>
          </nav>

          <div className="footer-actions">
            {!isNativeApp && (
              <a
                href="/assets/OtakuPlay.apk"
                download="OtakuPlay.apk"
                className="btn-secondary footer-apk-btn"
                title="Download Dedicated Android App"
              >
                <Smartphone size={14} color="var(--accent-color)" />
                <span>Android APK</span>
              </a>
            )}
            <div className="footer-tags">
              <span>SUB · HSUB · DUB</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
