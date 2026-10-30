import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Volume2,
  Maximize2,
  Minimize2,
  Settings,
  Check,
  ArrowLeft,
  Server,
  Radio,
  Sparkles,
  Info,
  Clock,
  UserCheck,
  Flame,
  Bookmark,
  Share2,
  Subtitles,
  Layers,
  Search,
  Sliders,
  Tv,
  Download
} from 'lucide-react';
import { getAnimeDetails, fetchFullFranchiseSeasons } from '../services/api';
import { savePlayerConfig, getPlayerConfig } from '../services/storage';
import AnimeCard from './AnimeCard';
import DownloadModal from './DownloadModal';
import PrimeXRayPlayer from './PrimeXRayPlayer';

// Helper for vendor-prefixed fullscreen checks
const isFullscreenElement = (element) => {
  const current =
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement;
  return element ? current === element : Boolean(current);
};

const requestElemFullscreen = (elem) => {
  if (!elem) return Promise.reject();
  if (elem.requestFullscreen) return elem.requestFullscreen();
  if (elem.webkitRequestFullscreen) return elem.webkitRequestFullscreen();
  if (elem.mozRequestFullScreen) return elem.mozRequestFullScreen();
  if (elem.msRequestFullscreen) return elem.msRequestFullscreen();
  return Promise.reject();
};

const exitDocFullscreen = () => {
  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
  if (document.msExitFullscreen) return document.msExitFullscreen();
  return Promise.reject();
};

export default function ZokoPlayer({
  anime,
  initialEpisode = 1,
  initialTime = 0,
  accentColor = '#35d5bf',
  onBack,
  onViewDetails,
  onProgressUpdate,
  onToggleWatchlist,
  isBookmarked = false,
  onWatchAnime,
  onAnimeChange
}) {
  const playerSavedConfig = getPlayerConfig();

  const [currentAnime, setCurrentAnime] = useState(anime);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode);
  const [currentTrack, setCurrentTrack] = useState(playerSavedConfig.preferredTrack || 'sub'); // 'sub', 'hsub', 'dub'
  const [server, setServer] = useState(playerSavedConfig.preferredServer || 'zoko'); // 'zoko' or 'kiwi'
  const [source, setSource] = useState(anime.idMal ? 'mal' : 'ani'); // 'mal' or 'ani'
  const [autoSkip, setAutoSkip] = useState(playerSavedConfig.autoSkip !== false);
  const [autoNext, setAutoNext] = useState(playerSavedConfig.autoNext !== false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [infoTab, setInfoTab] = useState('overview'); // 'overview', 'characters', 'seasons', 'recommendations'
  const [episodeRangeIndex, setEpisodeRangeIndex] = useState(0);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const [autoNextCountdown, setAutoNextCountdown] = useState(null);
  const [nextSeasonTarget, setNextSeasonTarget] = useState(null);
  const [allSeasons, setAllSeasons] = useState(anime.seasons || []);
  const [mainSeasons, setMainSeasons] = useState([]);
  const [sideContent, setSideContent] = useState([]);
  const [quickJumpVal, setQuickJumpVal] = useState('');
  const [detailsData, setDetailsData] = useState(anime);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState(initialTime);
  const [playbackDuration, setPlaybackDuration] = useState(1440);
  const [isPlaying, setIsPlaying] = useState(false);

  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  // Time & Progress throttling refs (Fix: LocalStorage flooding and time loss)
  const currentTimeRef = useRef(initialTime);
  const durationRef = useRef(0);
  const lastProgressSaveRef = useRef(0);

  // Sync state when anime prop changes
  useEffect(() => {
    setCurrentAnime(anime);
    setCurrentEpisode(initialEpisode);
    setSource(anime.idMal ? 'mal' : 'ani');
    currentTimeRef.current = initialTime;
    setPlayerLoading(true);
    if (anime.seasons && anime.seasons.length > 0) {
      setAllSeasons(anime.seasons);
    }
  }, [anime.id, initialEpisode]);

  // Fetch complete franchise seasons & anime details
  useEffect(() => {
    let active = true;

    fetchFullFranchiseSeasons(currentAnime).then(res => {
      if (!active) return;
      if (res && res.allSeasons && res.allSeasons.length > 0) {
        setAllSeasons(res.allSeasons);
        setMainSeasons(res.mainSeasons || []);
        setSideContent(res.sideContent || []);
      }
    }).catch(err => {
      console.warn('Could not fetch franchise seasons:', err);
    });

    getAnimeDetails(currentAnime.id).then(details => {
      if (!active) return;
      setDetailsData(details);
    }).catch(err => {
      console.warn('Could not fetch extra anime details:', err);
    });

    return () => { active = false; };
  }, [currentAnime.id]);

  const totalEpisodes = currentAnime.episodes || 24;

  // Source & ID Fallback Bug Fix: Fallback to 'ani' if MAL ID is missing
  const hasMalId = Boolean(currentAnime.idMal);
  const targetSource = (source === 'mal' && hasMalId) ? 'mal' : 'ani';
  const targetId = targetSource === 'mal' ? currentAnime.idMal : currentAnime.id;
  const rawColor = accentColor.replace('#', '');

  // Generate embed URL ONLY when stream target parameters change
  // Note: autoSkip and autoNext are passed initially, but dynamic changes use postMessage to prevent iframe reloading!
  const embedUrl = React.useMemo(() => {
    const timeToResume = Math.floor(currentTimeRef.current || 0);

    if (server === 'kiwi') {
      return `https://zokoanime.video/kiwi/${targetSource}/${targetId}/${currentEpisode}/${currentTrack}`;
    }

    const params = new URLSearchParams();
    params.set('color', rawColor);
    params.set('autoplay', '1');
    params.set('asi', autoSkip ? '1' : '0');
    params.set('autonext', autoNext ? '1' : '0');
    if (timeToResume > 0) {
      params.set('time', timeToResume.toString());
    }
    params.set('resume', '1');

    return `https://zokoanime.video/stream/${targetSource}/${targetId}/${currentEpisode}/${currentTrack}?${params.toString()}`;
  }, [server, targetSource, targetId, currentEpisode, currentTrack]); // Purposely omit autoSkip/autoNext to avoid video restarts

  const showToast = useCallback((msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3200);
  }, []);

  const sendPlayerMessage = useCallback((payload) => {
    try {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(f => {
        f.contentWindow?.postMessage(
          { channel: 'zokoanime', ...payload },
          'https://zokoanime.video'
        );
      });
    } catch (e) {
      // Cross-origin safe guard
    }
  }, []);

  // Throttled progress reporting (Fix: battery drain and micro-stuttering)
  const reportProgress = useCallback((pos, dur, force = false) => {
    if (pos === undefined || dur === undefined || dur <= 0) return;
    currentTimeRef.current = pos;
    durationRef.current = dur;
    setPlaybackCurrentTime(pos);
    if (dur > 0) setPlaybackDuration(dur);
    setIsPlaying(true);

    const now = Date.now();
    if (!force && now - lastProgressSaveRef.current < 3500) {
      return;
    }
    lastProgressSaveRef.current = now;

    onProgressUpdate?.({
      id: currentAnime.id,
      idMal: currentAnime.idMal,
      title: currentAnime.title,
      bannerImage: currentAnime.bannerImage,
      coverImage: currentAnime.coverImage,
      episode: currentEpisode,
      currentTime: Math.floor(pos),
      duration: Math.floor(dur)
    });
  }, [currentAnime, currentEpisode, onProgressUpdate]);

  const handleSeekTime = (targetSec) => {
    currentTimeRef.current = targetSec;
    setPlaybackCurrentTime(targetSec);
    sendPlayerMessage({ type: 'seek', time: targetSec });
  };

  // Determine if a next season exists
  const getNextSeason = useCallback(() => {
    const seasonList = mainSeasons.length > 0 ? mainSeasons : allSeasons;
    if (!seasonList || seasonList.length <= 1) return null;
    const currentIndex = seasonList.findIndex(s => s.id === currentAnime.id);
    if (currentIndex >= 0 && currentIndex < seasonList.length - 1) {
      return seasonList[currentIndex + 1];
    }
    return null;
  }, [mainSeasons, allSeasons, currentAnime.id]);

  // Trigger countdown for Auto-Next (supports next episode or next season)
  const triggerAutoNextCountdown = useCallback((targetSeason = null) => {
    let secondsLeft = 5;
    setNextSeasonTarget(targetSeason);
    setAutoNextCountdown(secondsLeft);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    countdownTimerRef.current = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearInterval(countdownTimerRef.current);
        setAutoNextCountdown(null);
        if (targetSeason) {
          handleSeasonChange(targetSeason.id);
        } else {
          currentTimeRef.current = 0;
          setCurrentEpisode(prev => prev + 1);
          setPlayerLoading(true);
        }
      } else {
        setAutoNextCountdown(secondsLeft);
      }
    }, 1000);
  }, []);

  const cancelAutoNext = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setAutoNextCountdown(null);
    setNextSeasonTarget(null);
  };

  // Sync range tab when currentEpisode changes
  const BATCH_SIZE = 40;
  const rangeCount = Math.ceil(totalEpisodes / BATCH_SIZE);

  useEffect(() => {
    const neededIndex = Math.floor((currentEpisode - 1) / BATCH_SIZE);
    if (neededIndex >= 0 && neededIndex < rangeCount) {
      setEpisodeRangeIndex(neededIndex);
    }
  }, [currentEpisode, totalEpisodes, rangeCount]);

  // Auto-scroll active episode into view in grid
  useEffect(() => {
    const timer = setTimeout(() => {
      const activeBtn = containerRef.current?.parentElement?.querySelector('.episode-cell-btn.active');
      if (activeBtn) {
        activeBtn.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentEpisode, episodeRangeIndex]);

  // PostMessage & Fullscreen Handling
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== 'https://zokoanime.video') return;
      const msg = event.data;
      if (!msg || msg.channel !== 'zokoanime') return;

      switch (msg.type) {
        case 'ready':
          setPlayerLoading(false);
          if (containerRef.current) {
            const isFull = isFullscreenElement(containerRef.current);
            setIsFullscreen(isFull);
            sendPlayerMessage({ type: 'fullscreen', active: isFull });
          }
          break;

        case 'watching-log':
          if (msg.currentTime !== undefined && msg.duration !== undefined) {
            reportProgress(msg.currentTime, msg.duration);
          }
          break;

        case 'time':
          if (msg.position !== undefined && msg.duration !== undefined) {
            reportProgress(msg.position, msg.duration);
          }
          break;

        case 'skipped':
          showToast(`⚡ Auto-skipped ${msg.name || 'intro/outro'}`);
          break;

        case 'ended':
        case 'complete':
          // Force save progress on episode completion
          reportProgress(durationRef.current, durationRef.current, true);
          if (autoNext) {
            if (currentEpisode < totalEpisodes) {
              triggerAutoNextCountdown(null);
            } else {
              const nextSeason = getNextSeason();
              if (nextSeason) {
                triggerAutoNextCountdown(nextSeason);
              }
            }
          }
          break;

        case 'fullscreen':
          if (containerRef.current) {
            if (msg.request === 'enter') {
              requestElemFullscreen(containerRef.current).then(() => {
                setIsFullscreen(true);
                sendPlayerMessage({ type: 'fullscreen', active: true });
              }).catch(() => { });
            } else if (msg.request === 'exit') {
              if (isFullscreenElement()) {
                exitDocFullscreen().then(() => {
                  setIsFullscreen(false);
                  sendPlayerMessage({ type: 'fullscreen', active: false });
                }).catch(() => { });
              }
            }
          }
          break;

        case 'error':
          showToast(`Stream note: ${msg.message || 'Connecting to mirror stream...'}`);
          break;

        default:
          break;
      }
    };

    const handleFullscreenChange = () => {
      const isFull = isFullscreenElement(containerRef.current);
      setIsFullscreen(isFull);
      sendPlayerMessage({ type: 'fullscreen', active: isFull });
    };

    window.addEventListener('message', handleMessage);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      window.removeEventListener('message', handleMessage);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      // Save last known progress when leaving player
      if (currentTimeRef.current > 0 && durationRef.current > 0) {
        reportProgress(currentTimeRef.current, durationRef.current, true);
      }
    };
  }, [currentAnime, currentEpisode, totalEpisodes, autoNext, reportProgress, getNextSeason, triggerAutoNextCountdown, sendPlayerMessage, showToast]);

  const handleNextEpisode = () => {
    if (currentEpisode < totalEpisodes) {
      currentTimeRef.current = 0;
      setCurrentEpisode(prev => prev + 1);
      setPlayerLoading(true);
    } else {
      const nextSeason = getNextSeason();
      if (nextSeason) {
        handleSeasonChange(nextSeason.id);
      }
    }
  };

  const handlePrevEpisode = () => {
    if (currentEpisode > 1) {
      currentTimeRef.current = 0;
      setCurrentEpisode(prev => prev - 1);
      setPlayerLoading(true);
    }
  };

  const handleSeasonChange = (seasonId) => {
    const target = allSeasons.find(s => s.id === seasonId);
    if (target) {
      currentTimeRef.current = 0;
      setCurrentAnime(target);
      setCurrentEpisode(1);
      setPlayerLoading(true);
      setSource(target.idMal ? 'mal' : 'ani');
      onAnimeChange?.(target, 1);
      showToast(`Switched to ${target.seasonName || 'Season'}`);
    }
  };

  const handleTrackChange = (newTrack) => {
    if (newTrack === currentTrack) return;
    setCurrentTrack(newTrack);
    setPlayerLoading(true);
    savePlayerConfig({ preferredTrack: newTrack });
    showToast(`Switched track to ${newTrack.toUpperCase()}`);
  };

  const handleServerChange = (newServer) => {
    if (newServer === server) return;
    setServer(newServer);
    setPlayerLoading(true);
    savePlayerConfig({ preferredServer: newServer });
    showToast(`Switched to ${newServer === 'zoko' ? 'Zoko HLS Engine' : 'Kiwi Mirror'}`);
  };

  const handleSourceChange = (newSource) => {
    if (newSource === source) return;
    setSource(newSource);
    setPlayerLoading(true);
    showToast(`Source ID set to ${newSource.toUpperCase()}`);
  };

  const handleToggleAutoSkip = () => {
    const nextVal = !autoSkip;
    setAutoSkip(nextVal);
    savePlayerConfig({ autoSkip: nextVal });
    sendPlayerMessage({ type: 'autoskip', on: nextVal });
    showToast(nextVal ? '⚡ Auto-skip Intro/Outro enabled' : 'Auto-skip disabled');
  };

  const handleToggleAutoNext = () => {
    const nextVal = !autoNext;
    setAutoNext(nextVal);
    savePlayerConfig({ autoNext: nextVal });
    sendPlayerMessage({ type: 'autonext', on: nextVal });
    showToast(nextVal ? 'Auto-next Episode enabled' : 'Auto-next disabled');
  };

  const handleQuickJump = (e) => {
    e.preventDefault();
    const ep = parseInt(quickJumpVal, 10);
    if (!isNaN(ep) && ep >= 1 && ep <= totalEpisodes) {
      currentTimeRef.current = 0;
      setCurrentEpisode(ep);
      setPlayerLoading(true);
      setQuickJumpVal('');
      showToast(`Jumping to Episode ${ep}`);
    } else {
      showToast(`Please enter an episode between 1 and ${totalEpisodes}`);
    }
  };

  const handleToggleFullscreen = () => {
    if (containerRef.current) {
      if (!isFullscreenElement(containerRef.current)) {
        requestElemFullscreen(containerRef.current).catch(() => { });
      } else {
        exitDocFullscreen().catch(() => { });
      }
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${currentAnime.title?.english || 'Anime'} - Episode ${currentEpisode}`,
        url: window.location.href
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard!');
    }
  };

  const currentRangeStart = episodeRangeIndex * BATCH_SIZE + 1;
  const currentRangeEnd = Math.min(totalEpisodes, (episodeRangeIndex + 1) * BATCH_SIZE);

  const episodesInCurrentRange = [];
  for (let i = currentRangeStart; i <= currentRangeEnd; i++) {
    episodesInCurrentRange.push(i);
  }

  const title = currentAnime.title?.english || currentAnime.title?.romaji || 'Anime';
  const activeSeasonName = currentAnime.seasonName || (allSeasons.find(s => s.id === currentAnime.id)?.seasonName) || 'Season 1';
  const characters = detailsData?.characters?.edges || currentAnime.characters?.edges || [];
  const recommendations = detailsData?.recommendations?.nodes?.map(n => n.mediaRecommendation).filter(Boolean) || currentAnime.recommendations?.nodes?.map(n => n.mediaRecommendation).filter(Boolean) || [];

  return (
    <div className={`player-page-container ${theaterMode ? 'theater-mode' : ''}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="player-toast" role="status" aria-live="polite">
          <Sparkles size={16} color="var(--accent-color)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Video & Content Column */}
      <div className="player-main-col">
        {/* Amazon Prime Video Custom Player with X-Ray Character Lore */}
        <PrimeXRayPlayer
          embedUrl={embedUrl}
          title={title}
          seasonName={activeSeasonName}
          currentEpisode={currentEpisode}
          totalEpisodes={totalEpisodes}
          currentTrack={currentTrack}
          server={server}
          characters={characters}
          detailsData={detailsData}
          isBookmarked={isBookmarked}
          playerLoading={playerLoading}
          accentColor="var(--accent-color)"
          onBack={onBack}
          onTrackChange={handleTrackChange}
          onServerChange={handleServerChange}
          onToggleWatchlist={() => onToggleWatchlist(currentAnime)}
          onShare={handleShare}
          onOpenDownload={() => setIsDownloadOpen(true)}
          onNextEpisode={handleNextEpisode}
          onPrevEpisode={handlePrevEpisode}
          onSeekTime={handleSeekTime}
          onToggleFullscreen={handleToggleFullscreen}
          isFullscreen={isFullscreen}
          theaterMode={theaterMode}
          setTheaterMode={setTheaterMode}
          sendPlayerMessage={sendPlayerMessage}
          currentTime={playbackCurrentTime}
          duration={playbackDuration}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          containerRef={containerRef}
          iframeRef={iframeRef}
          onIframeLoad={() => setPlayerLoading(false)}
          autoSkip={autoSkip}
          autoNext={autoNext}
          onToggleAutoSkip={handleToggleAutoSkip}
          onToggleAutoNext={handleToggleAutoNext}
          autoNextCountdown={autoNextCountdown}
          nextSeasonTarget={nextSeasonTarget}
          cancelAutoNext={cancelAutoNext}
          onStartNextSeason={(seasonId) => handleSeasonChange(seasonId)}
        />

        {/* Lower Section Tabbed Navigation (Overview, Characters, Seasons, Recommendations) */}
        <div className="player-info-card">
          <div className="player-tabs-nav">
            <button
              className={`player-tab-btn ${infoTab === 'overview' ? 'active' : ''}`}
              onClick={() => setInfoTab('overview')}
            >
              <Info size={14} />
              <span>Overview</span>
            </button>

            {characters.length > 0 && (
              <button
                className={`player-tab-btn ${infoTab === 'characters' ? 'active' : ''}`}
                onClick={() => setInfoTab('characters')}
              >
                <UserCheck size={14} />
                <span>Cast ({characters.length})</span>
              </button>
            )}

            {allSeasons.length > 1 && (
              <button
                className={`player-tab-btn ${infoTab === 'seasons' ? 'active' : ''}`}
                onClick={() => setInfoTab('seasons')}
              >
                <Layers size={14} />
                <span>Seasons ({allSeasons.length})</span>
              </button>
            )}

            {recommendations.length > 0 && (
              <button
                className={`player-tab-btn ${infoTab === 'recommendations' ? 'active' : ''}`}
                onClick={() => setInfoTab('recommendations')}
              >
                <Flame size={14} />
                <span>Recommended ({recommendations.length})</span>
              </button>
            )}
          </div>

          {/* Tab 1: Overview */}
          {infoTab === 'overview' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem', marginBottom: '0.75rem' }}>
                <div>
                  <h1 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.45rem)', fontWeight: 800, textTransform: 'uppercase' }}>
                    {title}
                  </h1>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                    {currentAnime.title?.native && <span>{currentAnime.title.native} • </span>}
                    <span>{activeSeasonName} • {currentAnime.format || 'TV'} • {currentAnime.seasonYear || '2024'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {currentAnime.genres?.map(g => (
                    <span key={g} className="badge" style={{ fontSize: '0.7rem' }}>
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.65', marginTop: '0.5rem' }}>
                {detailsData?.description?.replace(/<[^>]*>?/gm, '') || currentAnime.description?.replace(/<[^>]*>?/gm, '') || 'Enjoy high definition anime streaming powered by the ZokoAnime engine.'}
              </p>
            </div>
          )}

          {/* Tab 2: Characters & Voice Actors */}
          {infoTab === 'characters' && (
            <div>
              <div className="characters-roster-grid">
                {characters.slice(0, 8).map(({ role, node: char, voiceActors }) => {
                  const va = voiceActors?.[0];
                  return (
                    <div key={char.id} className="character-card">
                      <img
                        src={char.image?.large || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                        alt={char.name?.full}
                        className="char-avatar-img"
                        loading="lazy"
                      />
                      <div className="char-info">
                        <div className="char-role-badge">{role}</div>
                        <div className="char-name" title={char.name?.full}>{char.name?.full}</div>
                        {char.name?.native && <div className="char-native">{char.name.native}</div>}
                      </div>

                      {va && (
                        <div className="va-info">
                          <div className="va-details">
                            <div className="va-name" title={va.name?.full}>{va.name?.full}</div>
                            <div className="va-label">Japanese VA</div>
                          </div>
                          {va.image?.large && (
                            <img src={va.image.large} alt={va.name?.full} className="va-avatar" loading="lazy" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Seasons & Arcs */}
          {infoTab === 'seasons' && (
            <div>
              {mainSeasons.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
                    Main Story Seasons ({mainSeasons.length})
                  </div>
                  <div className="seasons-tab-grid">
                    {mainSeasons.map((s, idx) => {
                      const sTitle = s.title?.english || s.title?.romaji || `Season ${idx + 1}`;
                      const sName = s.seasonName || `Season ${idx + 1}`;
                      const isActive = s.id === currentAnime.id;
                      const poster = s.coverImage?.large || s.coverImage?.medium || currentAnime.coverImage?.large;

                      return (
                        <div
                          key={s.id}
                          className={`season-tab-card ${isActive ? 'active' : ''}`}
                          onClick={() => handleSeasonChange(s.id)}
                        >
                          <img src={poster} alt={sTitle} className="season-tab-poster" loading="lazy" />
                          <div className="season-tab-meta">
                            <div className="season-tab-name" title={sTitle}>{sName}</div>
                            <div className="season-tab-sub">{s.episodes || '?'} Episodes • {s.seasonYear || 'TV'}</div>
                            {isActive ? (
                              <span className="badge badge-brand" style={{ alignSelf: 'flex-start', marginTop: '0.2rem', fontSize: '0.65rem' }}>
                                Now Playing
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: 'var(--accent-color)', marginTop: '0.2rem', fontWeight: 600 }}>
                                Stream Season →
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {sideContent.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
                    Movies, OVAs & Specials ({sideContent.length})
                  </div>
                  <div className="seasons-tab-grid">
                    {sideContent.map((s) => {
                      const sTitle = s.title?.english || s.title?.romaji || 'Special';
                      const sName = s.seasonName || sTitle;
                      const isActive = s.id === currentAnime.id;
                      const poster = s.coverImage?.large || s.coverImage?.medium || currentAnime.coverImage?.large;

                      return (
                        <div
                          key={s.id}
                          className={`season-tab-card ${isActive ? 'active' : ''}`}
                          onClick={() => handleSeasonChange(s.id)}
                        >
                          <img src={poster} alt={sTitle} className="season-tab-poster" loading="lazy" />
                          <div className="season-tab-meta">
                            <div className="season-tab-name" title={sTitle}>{sName}</div>
                            <div className="season-tab-sub">{s.episodes || 1} Ep • {s.format || 'OVA'}</div>
                            {isActive ? (
                              <span className="badge badge-brand" style={{ alignSelf: 'flex-start', marginTop: '0.2rem', fontSize: '0.65rem' }}>
                                Now Playing
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: 'var(--accent-color)', marginTop: '0.2rem', fontWeight: 600 }}>
                                Play Now →
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {mainSeasons.length === 0 && sideContent.length === 0 && (
                <div className="seasons-tab-grid">
                  {allSeasons.map((s, idx) => {
                    const sTitle = s.title?.english || s.title?.romaji || `Season ${idx + 1}`;
                    const sName = s.seasonName || `Season ${idx + 1}`;
                    const isActive = s.id === currentAnime.id;
                    const poster = s.coverImage?.large || s.coverImage?.medium || currentAnime.coverImage?.large;

                    return (
                      <div
                        key={s.id}
                        className={`season-tab-card ${isActive ? 'active' : ''}`}
                        onClick={() => handleSeasonChange(s.id)}
                      >
                        <img src={poster} alt={sTitle} className="season-tab-poster" loading="lazy" />
                        <div className="season-tab-meta">
                          <div className="season-tab-name" title={sTitle}>{sName}</div>
                          <div className="season-tab-sub">{s.episodes || '?'} Episodes</div>
                          {isActive ? (
                            <span className="badge badge-brand" style={{ alignSelf: 'flex-start', marginTop: '0.2rem', fontSize: '0.65rem' }}>
                              Now Playing
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: 'var(--accent-color)', marginTop: '0.2rem', fontWeight: 600 }}>
                              Click to Switch →
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Recommendations */}
          {infoTab === 'recommendations' && (
            <div className="carousel-row">
              {recommendations.slice(0, 8).map(rec => (
                <AnimeCard
                  key={rec.id}
                  anime={rec}
                  onWatch={(recAnime) => onWatchAnime(recAnime, 1)}
                  onViewDetails={onViewDetails}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Episode Selector Sidebar */}
      <div className="player-sidebar-col">
        <div className="episode-sidebar-card">
          <div className="sidebar-header">
            <span className="sidebar-title">
              <Tv size={16} color="var(--accent-color)" />
              <span>Episodes</span>
            </span>
            <span className="badge badge-brand">
              {totalEpisodes} Total
            </span>
          </div>

          {/* Season Selector Dropdown */}
          {allSeasons.length > 1 && (
            <div className="season-select-wrapper" title="Select anime season, part or movie">
              <Layers size={15} color="var(--accent-color)" />
              <select
                className="season-select"
                value={currentAnime.id}
                onChange={(e) => handleSeasonChange(Number(e.target.value))}
                aria-label="Select season"
              >
                {mainSeasons.length > 0 ? (
                  <>
                    <optgroup label="Main Story Seasons">
                      {mainSeasons.map((s, idx) => (
                        <option key={s.id} value={s.id}>
                          {s.seasonName || `Season ${idx + 1}`} ({s.episodes || '?'} eps)
                        </option>
                      ))}
                    </optgroup>
                    {sideContent.length > 0 && (
                      <optgroup label="Movies, OVAs & Specials">
                        {sideContent.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.seasonName} ({s.episodes || 1} eps)
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </>
                ) : (
                  allSeasons.map((s, idx) => (
                    <option key={s.id} value={s.id}>
                      {s.seasonName || `Season ${idx + 1}`} ({s.episodes || '?'} eps)
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Quick Jump Input */}
          <form className="ep-quick-jump" onSubmit={handleQuickJump}>
            <Search size={14} color="var(--text-dim)" />
            <input
              type="number"
              min={1}
              max={totalEpisodes}
              placeholder={`Jump to ep (1-${totalEpisodes})...`}
              value={quickJumpVal}
              onChange={(e) => setQuickJumpVal(e.target.value)}
              aria-label="Quick jump to episode"
            />
          </form>

          {/* Episode Range Tabs (for series with > 40 episodes) */}
          {rangeCount > 1 && (
            <div className="episodes-range-tabs">
              {Array.from({ length: rangeCount }).map((_, idx) => {
                const s = idx * BATCH_SIZE + 1;
                const e = Math.min(totalEpisodes, (idx + 1) * BATCH_SIZE);
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`range-tab ${episodeRangeIndex === idx ? 'active' : ''}`}
                    onClick={() => setEpisodeRangeIndex(idx)}
                  >
                    {s}-{e}
                  </button>
                );
              })}
            </div>
          )}

          {/* Episode Grid Selector */}
          <div className="episodes-grid">
            {episodesInCurrentRange.map(epNum => (
              <button
                key={epNum}
                type="button"
                className={`episode-cell-btn ${currentEpisode === epNum ? 'active' : ''}`}
                onClick={() => {
                  currentTimeRef.current = 0;
                  setCurrentEpisode(epNum);
                  setPlayerLoading(true);
                }}
                title={`Episode ${epNum}`}
                aria-label={`Episode ${epNum}`}
              >
                <span>{epNum}</span>
              </button>
            ))}
          </div>

          {/* Fast Navigation Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              disabled={currentEpisode <= 1}
              onClick={handlePrevEpisode}
              style={{ justifyContent: 'center', opacity: currentEpisode <= 1 ? 0.4 : 1, padding: '0.5rem', fontSize: '0.8rem' }}
            >
              Prev Ep
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={currentEpisode >= totalEpisodes && !getNextSeason()}
              onClick={handleNextEpisode}
              style={{ justifyContent: 'center', opacity: currentEpisode >= totalEpisodes && !getNextSeason() ? 0.4 : 1, padding: '0.5rem', fontSize: '0.8rem' }}
            >
              Next Ep
            </button>
          </div>
        </div>

        {/* Quick Anime Specs Card */}
        <div className="episode-sidebar-card" style={{ marginTop: '0.75rem' }}>
          <div className="sidebar-header">
            <span className="sidebar-title" style={{ fontSize: '0.85rem' }}>Details & Specs</span>
            <Info size={15} color="var(--text-dim)" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>Status</span>
              <span style={{ fontWeight: 600 }}>{currentAnime.status || 'Finished'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>Duration</span>
              <span style={{ fontWeight: 600 }}>{currentAnime.duration ? `${currentAnime.duration} min` : '24 min'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>Score</span>
              <span style={{ fontWeight: 600, color: '#fbbf24' }}>★ {currentAnime.averageScore ? (currentAnime.averageScore / 10).toFixed(1) : '8.8'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>Studio</span>
              <span style={{ fontWeight: 600 }}>{detailsData?.studios?.nodes?.[0]?.name || currentAnime.studios?.nodes?.[0]?.name || 'Animation Studio'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Engine</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{server === 'zoko' ? 'Zoko Adaptive HLS' : 'Kiwi Mirror'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Offline Episode Download Modal */}
      <DownloadModal
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
        anime={currentAnime}
        currentEpisode={currentEpisode}
        currentTrack={currentTrack}
        server={server}
        onDownloadSaved={() => showToast(`Saved Episode ${currentEpisode} to Offline Downloads!`)}
      />
    </div>
  );
}
