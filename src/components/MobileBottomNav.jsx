import React from 'react';
import { Tv, Search, Bookmark, Download, Users } from 'lucide-react';

const TABS = [
  { view: 'home', label: 'Home', icon: Tv },
  { view: 'search', label: 'Search', icon: Search, isSearch: true },
  { view: 'party', label: 'Party', icon: Users, isParty: true },
  { view: 'watchlist', label: 'Saved', icon: Bookmark, badge: 'watchlist' },
  { view: 'downloads', label: 'Offline', icon: Download, badge: 'downloads' }
];

export default function MobileBottomNav({
  currentView,
  setCurrentView,
  watchlistCount = 0,
  downloadsCount = 0,
  partyInfo = null,
  onOpenPartyModal = () => {},
  onOpenSearch = () => {}
}) {
  const counts = { watchlist: watchlistCount, downloads: downloadsCount };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      {TABS.map(({ view, label, icon: Icon, badge, alsoActiveFor = [], isParty, isSearch }) => {
        const isActive = isParty
          ? Boolean(partyInfo?.active)
          : (!isSearch && (currentView === view || alsoActiveFor.includes(currentView)));
        const count = badge ? counts[badge] : (isParty && partyInfo?.active ? partyInfo.membersCount : 0);

        return (
          <button
            key={view}
            type="button"
            className={`mobile-nav-btn ${isActive ? 'active' : ''} ${isParty ? 'party-tab-btn' : ''}`}
            onClick={() => {
              if (isSearch) {
                onOpenSearch();
              } else if (isParty) {
                onOpenPartyModal();
              } else {
                setCurrentView(view);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            aria-label={count > 0 ? `${label} (${count})` : label}
            aria-current={isActive ? 'page' : undefined}
          >
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <Icon size={21} />
              {isParty && partyInfo?.active ? (
                <span className="mobile-nav-badge" style={{ background: '#22c55e', color: '#07080d', fontWeight: 900 }}>
                  LIVE
                </span>
              ) : count > 0 ? (
                <span className="mobile-nav-badge">
                  {count > 99 ? '99+' : count}
                </span>
              ) : null}
            </div>
            <span className="mobile-nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
