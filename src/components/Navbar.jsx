import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Search, 
  Bookmark, 
  Sun, 
  Moon, 
  Palette, 
  Flame, 
  Star, 
  Compass, 
  Tv 
} from 'lucide-react';

const ACCENT_COLORS = [
  { name: 'Cyber Teal', value: '#35d5bf' },
  { name: 'Neon Violet', value: '#a78bfa' },
  { name: 'Electric Blue', value: '#60a5fa' },
  { name: 'Emerald', value: '#34d399' },
  { name: 'Solar Amber', value: '#fbbf24' },
  { name: 'Crimson Rose', value: '#fb7185' },
];

export default function Navbar({
  currentView,
  setCurrentView,
  onOpenSearch,
  theme,
  setTheme,
  accentColor,
  setAccentColor,
  watchlistCount = 0
}) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
        setShowColorPicker(false);
      }
    };
    if (showColorPicker) {
      document.addEventListener('pointerdown', handleOutsideClick);
    }
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [showColorPicker]);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Brand Logo */}
        <div 
          className="brand-logo" 
          onClick={() => setCurrentView('home')} 
          style={{ cursor: 'pointer' }}
          title="Otaku Anime Streaming"
        >
          <div className="logo-icon">
            <Play size={18} fill="currentColor" />
          </div>
          <span className="logo-text">OTAKU<span style={{ fontSize: '0.85em', opacity: 0.85, color: 'var(--accent-color)' }}>PLAY</span></span>
        </div>

        {/* Navigation Links (Desktop/Tablet) */}
        <div className="nav-links">
          <button 
            className={`nav-item ${currentView === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentView('home')}
          >
            <Tv size={16} />
            <span>Home</span>
          </button>

          <button 
            className={`nav-item ${currentView === 'genres' ? 'active' : ''}`}
            onClick={() => setCurrentView('genres')}
          >
            <Compass size={16} />
            <span>Browse Genres</span>
          </button>

          <button 
            className={`nav-item ${currentView === 'popular' ? 'active' : ''}`}
            onClick={() => setCurrentView('popular')}
          >
            <Flame size={16} />
            <span>Popular</span>
          </button>

          <button 
            className={`nav-item ${currentView === 'top' ? 'active' : ''}`}
            onClick={() => setCurrentView('top')}
          >
            <Star size={16} />
            <span>Top Rated</span>
          </button>

          <button 
            className={`nav-item ${currentView === 'watchlist' ? 'active' : ''}`}
            onClick={() => setCurrentView('watchlist')}
          >
            <Bookmark size={16} />
            <span>Watchlist</span>
            {watchlistCount > 0 && (
              <span className="badge badge-brand" style={{ padding: '0.1rem 0.45rem', fontSize: '0.65rem' }}>
                {watchlistCount}
              </span>
            )}
          </button>
        </div>

        {/* Right Actions */}
        <div className="nav-actions">
          {/* Quick Search Trigger */}
          <button 
            className="search-trigger-btn"
            onClick={onOpenSearch}
            title="Search Anime (Ctrl+K or /)"
            aria-label="Search anime"
          >
            <Search size={16} />
            <span className="search-text">Search...</span>
            <span className="search-shortcut-badge">/</span>
          </button>

          {/* Accent Color Switcher */}
          <div style={{ position: 'relative' }} ref={colorPickerRef}>
            <button 
              className="icon-btn"
              onClick={() => setShowColorPicker(!showColorPicker)}
              title="Player Accent Color"
              style={{ color: accentColor }}
              aria-label="Change Accent Color"
            >
              <Palette size={18} />
            </button>

            {showColorPicker && (
              <div 
                className="color-picker-dropdown"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 110,
                  width: '180px'
                }}
              >
                <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Player Accent
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {ACCENT_COLORS.map(col => (
                    <button
                      key={col.value}
                      onClick={() => {
                        setAccentColor(col.value);
                        setShowColorPicker(false);
                      }}
                      title={col.name}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: col.value,
                        border: accentColor === col.value ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                        transform: accentColor === col.value ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.15s ease',
                        boxShadow: accentColor === col.value ? `0 0 10px ${col.value}` : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button 
            className="icon-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle dark/light theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </nav>
  );
}
