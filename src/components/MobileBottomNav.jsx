import React from 'react';
import { Tv, Compass, Flame, Bookmark, Download } from 'lucide-react';

export default function MobileBottomNav({
  currentView,
  setCurrentView,
  watchlistCount = 0,
  downloadsCount = 0
}) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <button
        type="button"
        className={`mobile-nav-btn ${currentView === 'home' ? 'active' : ''}`}
        onClick={() => {
          setCurrentView('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="Home"
      >
        <Tv size={19} />
        <span className="mobile-nav-label">Home</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-btn ${currentView === 'genres' ? 'active' : ''}`}
        onClick={() => {
          setCurrentView('genres');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="Genres"
      >
        <Compass size={19} />
        <span className="mobile-nav-label">Genres</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-btn ${currentView === 'downloads' ? 'active' : ''}`}
        onClick={() => {
          setCurrentView('downloads');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="Downloads"
      >
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <Download size={19} />
          {downloadsCount > 0 && (
            <span className="mobile-nav-badge">
              {downloadsCount > 99 ? '99+' : downloadsCount}
            </span>
          )}
        </div>
        <span className="mobile-nav-label">Offline</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-btn ${currentView === 'popular' ? 'active' : ''}`}
        onClick={() => {
          setCurrentView('popular');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="Popular"
      >
        <Flame size={19} />
        <span className="mobile-nav-label">Popular</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-btn ${currentView === 'watchlist' ? 'active' : ''}`}
        onClick={() => {
          setCurrentView('watchlist');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="Watchlist"
      >
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <Bookmark size={19} />
          {watchlistCount > 0 && (
            <span className="mobile-nav-badge">
              {watchlistCount > 99 ? '99+' : watchlistCount}
            </span>
          )}
        </div>
        <span className="mobile-nav-label">Saved</span>
      </button>
    </nav>
  );
}
