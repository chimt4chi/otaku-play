import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  Info,
  Clock,
  UserCheck,
  Subtitles,
  Server,
  Download,
  Share2,
  Bookmark,
  ArrowLeft,
  X,
  Sliders,
  Tv,
  Film,
  Music,
  ChevronRight,
  ShieldCheck,
  Eye,
  Layers
} from 'lucide-react';

// Format seconds into MM:SS or HH:MM:SS
function formatTime(sec) {
  if (isNaN(sec) || sec === null || sec < 0) return '00:00';
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function PrimeXRayPlayer({
  embedUrl,
  title,
  seasonName,
  currentEpisode,
  totalEpisodes,
  currentTrack,
  server,
  characters = [],
  detailsData = {},
  isBookmarked,
  playerLoading,
  accentColor = '#35d5bf',
  onBack,
  onTrackChange,
  onServerChange,
  onToggleWatchlist,
  onShare,
  onOpenDownload,
  onNextEpisode,
  onPrevEpisode,
  onSeekTime,
  onToggleFullscreen,
  isFullscreen,
  theaterMode,
  setTheaterMode,
  sendPlayerMessage,
  currentTime,
  duration,
  isPlaying,
  setIsPlaying,
  containerRef,
  iframeRef,
  onIframeLoad,
  autoSkip,
  autoNext,
  onToggleAutoSkip,
  onToggleAutoNext,
  autoNextCountdown,
  nextSeasonTarget,
  cancelAutoNext,
  onStartNextSeason
}) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isXRayOpen, setIsXRayOpen] = useState(false);
  const [xRayTab, setXRayTab] = useState('characters'); // 'characters', 'scene', 'trivia', 'music'
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [doubleTapAnim, setDoubleTapAnim] = useState(null); // 'left' or 'right'
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const controlsTimeoutRef = useRef(null);
  const playerWrapRef = useRef(null);
  const progressBarRef = useRef(null);
  const lastTapRef = useRef({ time: 0, x: 0 });

  // Handle Controls Auto-Hide (fade out when playing, keep visible when paused or X-Ray is open)
  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

    if (isPlaying && !isXRayOpen && !selectedCharacter) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3500);
    }
  }, [isPlaying, isXRayOpen, selectedCharacter]);

  useEffect(() => {
    if (!isPlaying || isXRayOpen || selectedCharacter) {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      showControlsTemporarily();
    }
  }, [isPlaying, isXRayOpen, selectedCharacter, showControlsTemporarily]);

  // Keyboard Shortcuts (Space, Arrow keys, F, M, X)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          handleTogglePlay();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          handleSkip(-10);
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          handleSkip(10);
          break;
        case 'f':
          e.preventDefault();
          onToggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          handleToggleMute();
          break;
        case 'x':
          e.preventDefault();
          setIsXRayOpen(prev => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleTogglePlay = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    sendPlayerMessage({ type: next ? 'play' : 'pause' });
    showControlsTemporarily();
  };

  const handleSkip = (seconds) => {
    const nextTime = Math.max(0, Math.min(duration || 1440, currentTime + seconds));
    onSeekTime?.(nextTime);
    sendPlayerMessage({ type: 'seek', time: nextTime });

    // Show quick visual ripple animation
    setDoubleTapAnim(seconds < 0 ? 'left' : 'right');
    setTimeout(() => setDoubleTapAnim(null), 600);
    showControlsTemporarily();
  };

  // Timeline Progress Scrubber
  const handleProgressClick = (e) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = percentage * duration;
    onSeekTime?.(targetTime);
    sendPlayerMessage({ type: 'seek', time: targetTime });
    showControlsTemporarily();
  };

  const handleProgressMouseMove = (e) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, hoverX / rect.width));
    setHoverTime(percentage * duration);
    setHoverPosition(hoverX);
  };

  // Volume & Mute
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    sendPlayerMessage({ type: 'mute', on: nextMute });
    showControlsTemporarily();
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    sendPlayerMessage({ type: 'volume', volume: val });
    showControlsTemporarily();
  };

  // Double-tap on mobile touch screens
  const handleTouchStart = (e) => {
    const now = Date.now();
    const touchX = e.touches[0].clientX;
    const timeDiff = now - lastTapRef.current.time;
    const distDiff = Math.abs(touchX - lastTapRef.current.x);

    if (timeDiff < 300 && distDiff < 60) {
      // Double tap detected
      const playerRect = playerWrapRef.current?.getBoundingClientRect();
      if (playerRect) {
        const mid = playerRect.left + playerRect.width / 2;
        if (touchX < mid) {
          handleSkip(-10);
        } else {
          handleSkip(10);
        }
      }
    } else {
      showControlsTemporarily();
    }

    lastTapRef.current = { time: now, x: touchX };
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Active characters list (up to 8 in scene)
  const inSceneCharacters = characters.slice(0, 8);
  const studioName = detailsData?.studios?.nodes?.[0]?.name || 'Animation Studio';
  const synopsis = detailsData?.description?.replace(/<[^>]*>?/gm, '') || 'High definition stream powered by ZokoAnime embed engine.';

  return (
    <div
      className={`prime-player-wrapper ${theaterMode ? 'theater' : ''} ${controlsVisible ? 'controls-active' : 'controls-hidden'}`}
      ref={(el) => {
        playerWrapRef.current = el;
        if (containerRef) {
          if (typeof containerRef === 'function') containerRef(el);
          else containerRef.current = el;
        }
      }}
      id="player-wrap"
      onMouseMove={showControlsTemporarily}
      onTouchStart={handleTouchStart}
    >
      {/* 1. Underlying Video Iframe Stream */}
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={`${title} - Episode ${currentEpisode}`}
        className="prime-video-iframe"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        onLoad={onIframeLoad}
      />

      {/* Auto Next Countdown Overlay */}
      {autoNextCountdown !== null && (
        <div className="prime-autonext-overlay">
          <div className="prime-autonext-card">
            <span className="prime-autonext-badge">{nextSeasonTarget ? 'SEASON COMPLETED' : 'EPISODE FINISHED'}</span>
            <h2 className="prime-autonext-title">
              {nextSeasonTarget
                ? `Next Season (${nextSeasonTarget.seasonName || 'Next Arc'}) in ${autoNextCountdown}s`
                : `Episode ${currentEpisode + 1} starting in ${autoNextCountdown}s`}
            </h2>
            <div className="prime-autonext-btns">
              <button
                className="btn-primary"
                onClick={() => {
                  cancelAutoNext?.();
                  if (nextSeasonTarget) {
                    onStartNextSeason?.(nextSeasonTarget.id);
                  } else {
                    onNextEpisode?.();
                  }
                }}
              >
                <Play size={16} fill="currentColor" />
                <span>{nextSeasonTarget ? 'Start Next Season' : `Play Episode ${currentEpisode + 1}`}</span>
              </button>
              <button className="btn-secondary" onClick={cancelAutoNext}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Loading Spinner Overlay */}
      {playerLoading && (
        <div className="prime-loading-scrim">
          <div className="prime-spinner" />
          <div className="prime-loading-label">
            Loading {server === 'zoko' ? 'Zoko HLS Multi-Track Stream' : 'Kiwi Stream Mirror'}...
          </div>
        </div>
      )}

      {/* 3. Double Tap Skip Ripple Animations */}
      {doubleTapAnim === 'left' && (
        <div className="prime-doubletap-indicator left">
          <RotateCcw size={32} />
          <span>-10s</span>
        </div>
      )}
      {doubleTapAnim === 'right' && (
        <div className="prime-doubletap-indicator right">
          <RotateCcw size={32} style={{ transform: 'scaleX(-1)' }} />
          <span>+10s</span>
        </div>
      )}

      {/* 4. Modern Amazon Prime Video Overlay HUD */}
      <div className={`prime-hud-overlay ${controlsVisible ? 'visible' : ''}`}>
        {/* Top Header Bar */}
        <div className="prime-top-bar">
          <div className="prime-top-left">
            <button
              type="button"
              className="prime-icon-btn prime-back-btn"
              onClick={onBack}
              title="Return to Catalog"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="prime-title-cluster">
              <span className="prime-anime-title" title={title}>{title}</span>
              <span className="prime-title-sep">•</span>
              <span className="prime-season-label">{seasonName}</span>
              <span className="prime-ep-pill">EP {currentEpisode}/{totalEpisodes}</span>
            </div>
          </div>

          <div className="prime-top-right">
            {/* Prime Video Signature X-Ray Button */}
            <button
              type="button"
              className={`prime-xray-badge-btn ${isXRayOpen ? 'active' : ''}`}
              onClick={() => {
                setIsXRayOpen(!isXRayOpen);
                showControlsTemporarily();
              }}
              title="Toggle Amazon Prime X-Ray Character Lore"
              aria-label="Toggle X-Ray"
            >
              <Sparkles size={14} className="xray-sparkle-icon" />
              <span className="xray-badge-text">X-RAY</span>
              <span className="xray-cast-count">{inSceneCharacters.length} CAST</span>
            </button>

            {/* Audio Track Selector */}
            <div className="prime-track-group">
              <button
                type="button"
                className={`prime-track-pill ${currentTrack === 'sub' ? 'active' : ''}`}
                onClick={() => onTrackChange('sub')}
              >
                SUB
              </button>
              <button
                type="button"
                className={`prime-track-pill ${currentTrack === 'hsub' ? 'active' : ''}`}
                onClick={() => onTrackChange('hsub')}
              >
                HSUB
              </button>
              <button
                type="button"
                className={`prime-track-pill ${currentTrack === 'dub' ? 'active' : ''}`}
                onClick={() => onTrackChange('dub')}
              >
                DUB
              </button>
            </div>

            {/* Server Selector */}
            {onServerChange && (
              <div className="prime-track-group">
                <button
                  type="button"
                  className={`prime-track-pill ${server === 'zoko' ? 'active' : ''}`}
                  onClick={() => onServerChange('zoko')}
                  title="Zoko Adaptive HLS Engine"
                >
                  ZOKO
                </button>
                <button
                  type="button"
                  className={`prime-track-pill ${server === 'kiwi' ? 'active' : ''}`}
                  onClick={() => onServerChange('kiwi')}
                  title="Kiwi Mirror Stream Server"
                >
                  KIWI
                </button>
              </div>
            )}

            {/* Download Episode Button */}
            <button
              type="button"
              className="prime-icon-btn"
              onClick={onOpenDownload}
              title="Download Episode for Offline Watching"
              aria-label="Download"
            >
              <Download size={17} />
            </button>

            {/* Watchlist Toggle */}
            <button
              type="button"
              className={`prime-icon-btn ${isBookmarked ? 'active-bookmark' : ''}`}
              onClick={onToggleWatchlist}
              title={isBookmarked ? 'In Watchlist' : 'Add to Watchlist'}
              aria-label="Watchlist"
            >
              <Bookmark size={17} fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* Center Playback Controls (10s Back, Play/Pause, 10s Forward) */}
        <div className="prime-center-controls">
          <button
            type="button"
            className="prime-skip-round-btn"
            onClick={() => handleSkip(-10)}
            title="Rewind 10 seconds (Left Arrow)"
            aria-label="Rewind 10 seconds"
          >
            <RotateCcw size={26} />
            <span className="prime-skip-text">10</span>
          </button>

          <button
            type="button"
            className="prime-play-main-btn"
            onClick={handleTogglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={38} fill="currentColor" />
            ) : (
              <Play size={38} fill="currentColor" style={{ marginLeft: '4px' }} />
            )}
          </button>

          <button
            type="button"
            className="prime-skip-round-btn"
            onClick={() => handleSkip(10)}
            title="Forward 10 seconds (Right Arrow)"
            aria-label="Forward 10 seconds"
          >
            <RotateCcw size={26} style={{ transform: 'scaleX(-1)' }} />
            <span className="prime-skip-text">10</span>
          </button>
        </div>

        {/* Bottom Bar: Timeline Scrubber & Player Controls */}
        <div className="prime-bottom-bar">
          {/* Interactive Timeline Progress Bar */}
          <div
            className="prime-progress-container"
            ref={progressBarRef}
            onClick={handleProgressClick}
            onMouseMove={handleProgressMouseMove}
            onMouseLeave={() => setHoverTime(null)}
          >
            {/* Hover timestamp tooltip */}
            {hoverTime !== null && (
              <div
                className="prime-progress-hover-tooltip"
                style={{ left: `${hoverPosition}px` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}

            <div className="prime-progress-track">
              <div
                className="prime-progress-fill"
                style={{ width: `${progressPercent}%`, backgroundColor: accentColor }}
              />
              <div
                className="prime-progress-thumb"
                style={{ left: `${progressPercent}%`, borderColor: accentColor }}
              />
            </div>
          </div>

          {/* Bottom Controls Row */}
          <div className="prime-bottom-controls-row">
            <div className="prime-controls-left">
              <button
                type="button"
                className="prime-icon-btn-sm"
                onClick={handleTogglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <button
                type="button"
                className="prime-icon-btn-sm"
                onClick={onPrevEpisode}
                disabled={currentEpisode <= 1}
                title="Previous Episode"
                aria-label="Previous episode"
              >
                <SkipBack size={18} />
              </button>

              <button
                type="button"
                className="prime-icon-btn-sm"
                onClick={onNextEpisode}
                disabled={currentEpisode >= totalEpisodes}
                title="Next Episode"
                aria-label="Next episode"
              >
                <SkipForward size={18} />
              </button>

              {/* Volume & Mute */}
              <div className="prime-volume-cluster">
                <button
                  type="button"
                  className="prime-icon-btn-sm"
                  onClick={handleToggleMute}
                  title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                >
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="prime-volume-slider"
                  aria-label="Volume slider"
                />
              </div>

              {/* Timestamp */}
              <div className="prime-time-stamp">
                <span className="current">{formatTime(currentTime)}</span>
                <span className="sep">/</span>
                <span className="total">{formatTime(duration)}</span>
              </div>
            </div>

            <div className="prime-controls-right">
              {/* Auto Skip Opening/Ending Intro */}
              {onToggleAutoSkip && (
                <button
                  type="button"
                  className={`prime-control-pill-btn ${autoSkip ? 'active' : ''}`}
                  onClick={onToggleAutoSkip}
                  title="Automatically skip anime opening and ending themes"
                >
                  <Sparkles size={13} />
                  <span>Auto-Skip</span>
                </button>
              )}

              {/* Auto Next Episode */}
              {onToggleAutoNext && (
                <button
                  type="button"
                  className={`prime-control-pill-btn ${autoNext ? 'active' : ''}`}
                  onClick={onToggleAutoNext}
                  title="Play next episode automatically when finished"
                >
                  <RotateCcw size={13} />
                  <span>Auto-Next</span>
                </button>
              )}

              {/* X-Ray Quick Toggle */}
              <button
                type="button"
                className={`prime-control-pill-btn ${isXRayOpen ? 'active' : ''}`}
                onClick={() => setIsXRayOpen(!isXRayOpen)}
                title="Open Amazon Prime X-Ray Drawer"
              >
                <Eye size={14} />
                <span>X-Ray Characters</span>
              </button>

              {/* Speed Selector */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="prime-control-pill-btn"
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  title="Playback Speed"
                >
                  <span>{playbackSpeed}x</span>
                </button>

                {showSpeedMenu && (
                  <div className="prime-speed-dropdown">
                    {[0.75, 1, 1.25, 1.5, 2].map(s => (
                      <button
                        key={s}
                        type="button"
                        className={`prime-speed-item ${playbackSpeed === s ? 'active' : ''}`}
                        onClick={() => {
                          setPlaybackSpeed(s);
                          setShowSpeedMenu(false);
                          sendPlayerMessage({ type: 'speed', speed: s });
                        }}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Theater View Toggle */}
              <button
                type="button"
                className={`prime-icon-btn-sm ${theaterMode ? 'active' : ''}`}
                onClick={() => setTheaterMode(!theaterMode)}
                title={theaterMode ? 'Exit Theater' : 'Theater Mode'}
              >
                <Sliders size={17} />
              </button>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                className="prime-icon-btn-sm"
                onClick={onToggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* 5. In-Scene Characters Floating Strip (Amazon Prime Video Signature X-Ray Strip) */}
        {!isXRayOpen && inSceneCharacters.length > 0 && (
          <div className="prime-xray-inscene-strip">
            <div className="xray-strip-header">
              <span className="xray-tag">X-RAY</span>
              <span className="xray-label">IN THIS SCENE & CAST</span>
            </div>

            <div className="xray-strip-row">
              {inSceneCharacters.map(({ role, node: char, voiceActors }) => {
                const va = voiceActors?.[0];
                return (
                  <button
                    key={char.id}
                    type="button"
                    className="xray-character-chip"
                    onClick={() => setSelectedCharacter({ char, role, va })}
                    title={`View Lore: ${char.name?.full}`}
                  >
                    <img
                      src={char.image?.large || char.image?.medium}
                      alt={char.name?.full}
                      className="xray-chip-avatar"
                      loading="lazy"
                    />
                    <div className="xray-chip-info">
                      <span className="xray-chip-char-name">{char.name?.full}</span>
                      <span className="xray-chip-va-name">
                        {va?.name?.full ? `VA: ${va.name.full}` : role}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 6. Amazon Prime X-Ray Full Drawer / Panel */}
      {isXRayOpen && (
        <div className="prime-xray-drawer">
          <div className="xray-drawer-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div className="xray-drawer-badge">
                <Sparkles size={16} />
                <span>X-RAY</span>
              </div>
              <h3 className="xray-drawer-title">{title}</h3>
            </div>

            <button
              type="button"
              className="prime-icon-btn"
              onClick={() => setIsXRayOpen(false)}
              aria-label="Close X-Ray"
            >
              <X size={18} />
            </button>
          </div>

          {/* X-Ray Tab Selector */}
          <div className="xray-tabs-nav">
            <button
              type="button"
              className={`xray-tab-item ${xRayTab === 'characters' ? 'active' : ''}`}
              onClick={() => setXRayTab('characters')}
            >
              <UserCheck size={14} />
              <span>Cast & Characters ({characters.length})</span>
            </button>
            <button
              type="button"
              className={`xray-tab-item ${xRayTab === 'scene' ? 'active' : ''}`}
              onClick={() => setXRayTab('scene')}
            >
              <Film size={14} />
              <span>Episode Lore</span>
            </button>
            <button
              type="button"
              className={`xray-tab-item ${xRayTab === 'trivia' ? 'active' : ''}`}
              onClick={() => setXRayTab('trivia')}
            >
              <Info size={14} />
              <span>Trivia & Studio</span>
            </button>
          </div>

          {/* X-Ray Tab Content */}
          <div className="xray-drawer-body">
            {/* Tab 1: Cast & Characters */}
            {xRayTab === 'characters' && (
              <div className="xray-characters-grid">
                {characters.map(({ role, node: char, voiceActors }) => {
                  const va = voiceActors?.[0];
                  return (
                    <div
                      key={char.id}
                      className="xray-character-card"
                      onClick={() => setSelectedCharacter({ char, role, va })}
                    >
                      <div className="xray-card-portrait-wrap">
                        <img
                          src={char.image?.large}
                          alt={char.name?.full}
                          className="xray-card-char-img"
                          loading="lazy"
                        />
                        {va?.image?.large && (
                          <img
                            src={va.image.large}
                            alt={va.name?.full}
                            className="xray-card-va-float"
                            title={`Voice Actor: ${va.name?.full}`}
                            loading="lazy"
                          />
                        )}
                      </div>

                      <div className="xray-card-details">
                        <div className="xray-role-tag">{role}</div>
                        <h4 className="xray-char-name">{char.name?.full}</h4>
                        {char.name?.native && (
                          <div className="xray-native-name">{char.name.native}</div>
                        )}

                        {va && (
                          <div className="xray-va-row">
                            <span className="xray-va-prefix">VA:</span>
                            <span className="xray-va-full">{va.name?.full}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 2: Episode & Scene Lore */}
            {xRayTab === 'scene' && (
              <div className="xray-lore-content">
                <div className="xray-lore-banner">
                  <div className="xray-lore-heading">
                    Episode {currentEpisode} • {seasonName}
                  </div>
                  <div className="xray-lore-sub">
                    Duration: {detailsData?.duration ? `${detailsData.duration} min` : '24 min'} • Studio: {studioName}
                  </div>
                </div>

                <div className="xray-lore-section">
                  <h4>SYNOPSIS</h4>
                  <p>{synopsis}</p>
                </div>

                {detailsData?.genres && (
                  <div className="xray-lore-section">
                    <h4>THEMES & GENRES</h4>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {detailsData.genres.map(g => (
                        <span key={g} className="badge">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Trivia & Studio */}
            {xRayTab === 'trivia' && (
              <div className="xray-trivia-content">
                <div className="xray-trivia-card">
                  <h4>Animation Studio</h4>
                  <p style={{ color: 'var(--accent-color)', fontWeight: 700, fontSize: '1.1rem' }}>
                    {studioName}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    Known for high-octane battle sequences, cinematic direction, and meticulous keyframe animation.
                  </p>
                </div>

                <div className="xray-trivia-card">
                  <h4>Community Score</h4>
                  <p style={{ color: '#fbbf24', fontWeight: 800, fontSize: '1.2rem' }}>
                    ★ {detailsData?.averageScore ? (detailsData.averageScore / 10).toFixed(1) : '8.8'} / 10
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    Ranked among top-tier anime franchises based on global AniList viewer consensus.
                  </p>
                </div>

                <div className="xray-trivia-card">
                  <h4>Engine & Quality</h4>
                  <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    Streaming in adaptive HLS multi-bitrate with synchronized multi-track audio and lossless subtitle rendering.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. Detailed Character Inspector Card (Clicking Character inside X-Ray) */}
      {selectedCharacter && (
        <div className="xray-character-modal-overlay" onClick={() => setSelectedCharacter(null)}>
          <div className="xray-character-modal-card" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="prime-icon-btn xray-modal-close"
              onClick={() => setSelectedCharacter(null)}
              aria-label="Close Character Lore"
            >
              <X size={18} />
            </button>

            <div className="xray-char-modal-header">
              <img
                src={selectedCharacter.char.image?.large}
                alt={selectedCharacter.char.name?.full}
                className="xray-char-modal-img"
              />

              <div className="xray-char-modal-meta">
                <span className="badge badge-brand">{selectedCharacter.role}</span>
                <h3 className="xray-modal-char-name">{selectedCharacter.char.name?.full}</h3>
                {selectedCharacter.char.name?.native && (
                  <div className="xray-modal-native">{selectedCharacter.char.name.native}</div>
                )}

                {selectedCharacter.va && (
                  <div className="xray-modal-va-block">
                    <img
                      src={selectedCharacter.va.image?.large}
                      alt={selectedCharacter.va.name?.full}
                      className="xray-modal-va-img"
                    />
                    <div>
                      <div className="xray-modal-va-role">Japanese Voice Actor (Seiyuu)</div>
                      <div className="xray-modal-va-name">{selectedCharacter.va.name?.full}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="xray-char-modal-body">
              <h4>Character Lore & Biography</h4>
              <p>
                {selectedCharacter.char.description?.replace(/<[^>]*>?/gm, '') ||
                  'Key character playing a pivotal role in the storyline, motivations, and action sequence of this anime series.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
