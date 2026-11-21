import React from 'react';
import { Tv, Compass, Flame, Bookmark, Download, Users } from 'lucide-react';

const TABS = [
  { view: 'home', label: 'Home', icon: Tv },
  { view: 'genres', label: 'Browse', icon: Compass, alsoActiveFor: ['popular', 'top'] },
  { view: 'party', label: 'Party', icon: Users, isParty: true },
  { view: 'downloads', label: 'Offline', icon: Download, badge: 'downloads' },
  { view: 'watchlist', label: 'Saved', icon: Bookmark, badge: 'watchlist' }
];

export default function MobileBottomNav({
  currentView,
  setCurrentView,
  watchlistCount = 0,
  downloadsCount = 0,
  partyInfo = null,
  onOpenPartyModal = () => {}
}) {
  const counts = { watchlist: watchlistCount, downloads: downloadsCount };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      {TABS.map(({ view, label, icon: Icon, badge, alsoActiveFor = [], isParty }) => {
        const isActive = isParty
          ? Boolean(partyInfo?.active)
          : (currentView === view || alsoActiveFor.includes(currentView));
        const count = badge ? counts[badge] : (isParty && partyInfo?.active ? partyInfo.membersCount : 0);

        return (
          <button
            key={view}
            type="button"
            className={`mobile-nav-btn ${isActive ? 'active' : ''} ${isParty ? 'party-tab-btn' : ''}`}
            onClick={() => {
              if (isParty) {
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
