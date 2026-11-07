import React from 'react';
import { Tv, Compass, Flame, Bookmark, Download } from 'lucide-react';

const TABS = [
  { view: 'home', label: 'Home', icon: Tv },
  { view: 'genres', label: 'Genres', icon: Compass },
  { view: 'popular', label: 'Popular', icon: Flame, alsoActiveFor: ['top'] },
  { view: 'downloads', label: 'Offline', icon: Download, badge: 'downloads' },
  { view: 'watchlist', label: 'Saved', icon: Bookmark, badge: 'watchlist' }
];

export default function MobileBottomNav({
  currentView,
  setCurrentView,
  watchlistCount = 0,
  downloadsCount = 0
}) {
  const counts = { watchlist: watchlistCount, downloads: downloadsCount };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      {TABS.map(({ view, label, icon: Icon, badge, alsoActiveFor = [] }) => {
        const isActive = currentView === view || alsoActiveFor.includes(currentView);
        const count = badge ? counts[badge] : 0;

        return (
          <button
            key={view}
            type="button"
            className={`mobile-nav-btn ${isActive ? 'active' : ''}`}
            onClick={() => {
              setCurrentView(view);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            aria-label={count > 0 ? `${label} (${count})` : label}
            aria-current={isActive ? 'page' : undefined}
          >
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <Icon size={21} />
              {count > 0 && (
                <span className="mobile-nav-badge">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </div>
            <span className="mobile-nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
