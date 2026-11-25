import React from 'react';
import { Search, Home, Compass, Flame, Star, Bookmark, ListVideo, Users } from 'lucide-react';

const ITEMS = [
  { view: 'search', label: 'Search', icon: Search },
  { view: 'home', label: 'Home', icon: Home },
  { view: 'genres', label: 'Genres', icon: Compass },
  { view: 'popular', label: 'Popular', icon: Flame },
  { view: 'top', label: 'Top Rated', icon: Star },
  { view: 'watchlist', label: 'My List', icon: Bookmark },
  { view: 'downloads', label: 'Episodes', icon: ListVideo },
  { view: 'party', label: 'Watch Party', icon: Users },
];

// Left navigation rail for TV: icons only, labels slide out while it holds focus
export default function TvSideNav({ currentView, setCurrentView, onOpenSearch, onOpenPartyModal }) {
  return (
    <nav className="tv-rail" aria-label="Main navigation">
      {ITEMS.map(({ view, label, icon: Icon }) => (
        <button
          key={view}
          type="button"
          className={`tv-rail-item ${currentView === view ? 'active' : ''}`}
          aria-current={currentView === view ? 'page' : undefined}
          onClick={() => {
            if (view === 'search') onOpenSearch();
            else if (view === 'party') onOpenPartyModal();
            else setCurrentView(view);
          }}
        >
          <Icon size={22} />
          <span className="tv-rail-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
