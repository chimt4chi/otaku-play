import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';

const PLAYER_ORIGIN = 'https://zokoanime.video';
const HUD_MS = 3500;

const clock = (s) => {
  const t = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

// Remote control for fullscreen playback on TV. Keys can't reach inside the cross-origin
// player, so this layer sits on top of it, holds focus, and drives it through the player's
// documented postMessage commands (play, pause, seek, state).
export default function TvPlayerControls({ title, episode, send, onNext, onPrevious, onShowEpisodes }) {
  const layerRef = useRef(null);
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const pausedRef = useRef(false);
  const seekingUntilRef = useRef(0);
  const hideTimerRef = useRef(null);
  const [hud, setHud] = useState({ visible: true, position: 0, duration: 0, paused: false });

  const showHud = useCallback(() => {
    setHud({
      visible: true,
      position: positionRef.current,
      duration: durationRef.current,
      paused: pausedRef.current,
    });
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      // Stay on screen while paused
      if (!pausedRef.current) setHud(h => ({ ...h, visible: false }));
    }, HUD_MS);
  }, []);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== PLAYER_ORIGIN) return;
      const msg = event.data;
      if (!msg || msg.channel !== 'zokoanime') return;
      const position = msg.position ?? msg.currentTime;
      // Right after a seek, ignore reports from before it landed
      if (position !== undefined && Date.now() > seekingUntilRef.current) positionRef.current = position;
      if (msg.duration) durationRef.current = msg.duration;
      if (msg.type === 'play') { pausedRef.current = false; showHud(); }
      else if (msg.type === 'pause') { pausedRef.current = true; showHud(); }
      else if (msg.type === 'state' && msg.paused !== undefined) pausedRef.current = msg.paused;
      else if (msg.type === 'ready') { send({ type: 'state' }); layerRef.current?.focus(); }
    };
    // The player may grab focus when it loads, which would swallow the remote: take it back
    const reclaim = () => setTimeout(() => layerRef.current?.focus(), 100);

    window.addEventListener('message', onMessage);
    window.addEventListener('blur', reclaim);
    layerRef.current?.focus();
    send({ type: 'state' });
    showHud();
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('blur', reclaim);
      clearTimeout(hideTimerRef.current);
    };
  }, [send, showHud]);

  const setPlaying = (playing) => {
    pausedRef.current = !playing;
    send({ type: playing ? 'play' : 'pause' });
    showHud();
  };
  const togglePlay = () => setPlaying(pausedRef.current);

  const seekBy = (delta) => {
    const max = durationRef.current || Infinity;
    positionRef.current = Math.min(max, Math.max(0, positionRef.current + delta));
    seekingUntilRef.current = Date.now() + 1200;
    send({ type: 'seek', time: positionRef.current });
    showHud();
  };

  const handleKeyDown = (event) => {
    const actions = {
      Enter: togglePlay,
      ' ': togglePlay,
      MediaPlayPause: togglePlay,
      MediaPlay: () => setPlaying(true),
      MediaPause: () => setPlaying(false),
      ArrowLeft: () => seekBy(-10),
      ArrowRight: () => seekBy(10),
      MediaRewind: () => seekBy(-30),
      MediaFastForward: () => seekBy(30),
      MediaTrackNext: onNext,
      MediaTrackPrevious: onPrevious,
      ArrowUp: showHud,
      ArrowDown: onShowEpisodes,
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    // Holding OK must not flicker between play and pause
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) return;
    action();
  };

  const percent = hud.duration ? Math.min(100, (hud.position / hud.duration) * 100) : 0;

  return (
    <div
      ref={layerRef}
      className="tv-player-layer"
      tabIndex={0}
      data-tv-autofocus
      onKeyDown={handleKeyDown}
      aria-label="Video remote controls"
    >
      <div className={`tv-hud ${hud.visible ? 'visible' : ''}`}>
        <div className="tv-hud-title">{title} • Episode {episode}</div>
        <div className="tv-hud-row">
          {hud.paused ? <Pause size={18} /> : <Play size={18} />}
          <span>{clock(hud.position)}</span>
          <div className="tv-hud-track"><div style={{ width: `${percent}%` }} /></div>
          <span>{clock(hud.duration)}</span>
        </div>
        <div className="tv-hud-hint">OK play / pause • ◀ ▶ skip 10s • ▼ episodes • Back exit fullscreen</div>
      </div>
    </div>
  );
}
