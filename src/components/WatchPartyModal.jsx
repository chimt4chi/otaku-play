import React, { useState } from 'react';
import { Users, X, Copy, Check, Sparkles, Play, LogIn, Crown, Radio, ArrowRight, ShieldCheck } from 'lucide-react';
import { PARTY_COLORS, cleanRoomCode } from '../services/watchPartyService';
import { CURRENT_APP_VERSION } from '../services/otaService';

export default function WatchPartyModal({
  isOpen,
  onClose,
  currentAnime,
  currentEpisode = 1,
  currentTime = 0,
  onCreateParty,
  onJoinParty,
  initialRoomCode = ''
}) {
  const [activeTab, setActiveTab] = useState(initialRoomCode || !currentAnime ? 'join' : 'create');
  const [username, setUsername] = useState(() => localStorage.getItem('otaku_username') || 'Otaku Watcher');
  const [selectedColor, setSelectedColor] = useState(PARTY_COLORS[0]);
  const [joinCode, setJoinCode] = useState(cleanRoomCode(initialRoomCode));
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const animeTitle = currentAnime?.title?.english || currentAnime?.title?.romaji || 'No Anime Selected';

  const handleCreate = async () => {
    if (!username.trim()) {
      setErrorMsg('Please enter your display name');
      return;
    }
    if (!currentAnime) {
      setErrorMsg('Please start watching an anime first before hosting, or join an existing room.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    localStorage.setItem('otaku_username', username.trim());

    try {
      await onCreateParty?.({
        username: username.trim(),
        avatarColor: selectedColor,
        anime: currentAnime,
        episode: currentEpisode,
        currentTime
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Could not create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!username.trim()) {
      setErrorMsg('Please enter your display name');
      return;
    }
    const clean = cleanRoomCode(joinCode);
    if (!clean) {
      setErrorMsg('Please enter a valid 4-character Room Code (e.g. OTK-7X9P)');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    localStorage.setItem('otaku_username', username.trim());

    try {
      await onJoinParty?.({
        roomCode: clean,
        username: username.trim(),
        avatarColor: selectedColor
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Could not connect to room. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="search-modal-backdrop"
      onClick={onClose}
      style={{ zIndex: 250 }}
    >
      <div
        className="search-modal-box download-modal-box watch-party-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="watch-party-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="download-modal-header" style={{ borderBottom: 'none', paddingBottom: '0.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="ota-icon-wrap" style={{ width: '38px', height: '38px' }}>
              <Users size={19} color="var(--accent-color)" />
            </div>
            <div>
              <div className="ota-badge-pill" style={{ color: 'var(--accent-color)' }}>
                Real-Time WebRTC P2P
              </div>
              <h3 id="watch-party-title" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.1rem 0 0' }}>
                Anime Watch Party
              </h3>
            </div>
          </div>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ padding: '0 1.5rem', marginTop: '0.5rem' }}>
          <div className="segmented-control" style={{ width: '100%', display: 'flex' }}>
            <button
              className={`segmented-btn ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => { setActiveTab('create'); setErrorMsg(null); }}
              style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.85rem' }}
            >
              <Crown size={14} style={{ marginRight: '6px' }} />
              Host a Party
            </button>
            <button
              className={`segmented-btn ${activeTab === 'join' ? 'active' : ''}`}
              onClick={() => { setActiveTab('join'); setErrorMsg(null); }}
              style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.85rem' }}
            >
              <LogIn size={14} style={{ marginRight: '6px' }} />
              Join a Room
            </button>
          </div>
        </div>

        <div className="download-modal-body" style={{ padding: '1.2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {errorMsg && (
            <div className="ota-error-box" style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', textAlign: 'left', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              {errorMsg}
            </div>
          )}

          {/* Profile Name & Avatar Color */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Your Display Name
            </label>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: selectedColor,
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  color: '#07080d',
                  flexShrink: 0,
                  boxShadow: `0 0 12px ${selectedColor}66`
                }}
              >
                {(username[0] || 'O').toUpperCase()}
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter nickname..."
                maxLength={24}
                style={{
                  flex: 1,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.65rem 0.85rem',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Avatar Color Picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              Avatar Color:
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {PARTY_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: color,
                    border: selectedColor === color ? '2px solid #fff' : '2px solid transparent',
                    transform: selectedColor === color ? 'scale(1.2)' : 'none',
                    cursor: 'pointer',
                    boxShadow: selectedColor === color ? `0 0 10px ${color}` : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
          </div>

          {/* TAB 1: Host a Party */}
          {activeTab === 'create' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem' }}>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Now Streaming
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-color)', marginTop: '0.2rem' }}>
                  {animeTitle}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
                  Episode {currentEpisode} • Zero latency synchronized streaming
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                ✨ As the host, you hold playback control. When you pause, resume, seek, or change episodes, all connected friends synchronize with you instantly!
              </div>

              <button
                className="btn-primary"
                onClick={handleCreate}
                disabled={loading}
                style={{ padding: '0.85rem', justifyContent: 'center', fontSize: '0.95rem' }}
              >
                {loading ? <div className="player-spinner" style={{ width: '18px', height: '18px', margin: 0 }} /> : <Radio size={16} />}
                <span>{loading ? 'Initializing Room...' : 'Start Watch Party Room'}</span>
              </button>
            </div>
          )}

          {/* TAB 2: Join a Room */}
          {activeTab === 'join' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Room Code or Link
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="OTK-XXXX"
                  maxLength={12}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    color: 'var(--text-main)',
                    fontSize: '1.15rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    textAlign: 'center',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                🔗 Enter the 4-digit code (e.g. <b style={{ color: 'var(--accent-color)' }}>OTK-4A8Z</b>) shared by your host to jump straight into their synchronized anime room.
              </div>

              <button
                className="btn-primary"
                onClick={handleJoin}
                disabled={loading || !joinCode.trim()}
                style={{ padding: '0.85rem', justifyContent: 'center', fontSize: '0.95rem' }}
              >
                {loading ? <div className="player-spinner" style={{ width: '18px', height: '18px', margin: 0 }} /> : <ArrowRight size={16} />}
                <span>{loading ? 'Connecting to Room...' : 'Join Room'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ota-modal-footer" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-dim)' }}>
            <ShieldCheck size={14} color="var(--accent-color)" />
            <span>P2P Encrypted • No Account Needed</span>
          </div>
          <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>v{CURRENT_APP_VERSION}</span>
        </div>
      </div>
    </div>
  );
}
