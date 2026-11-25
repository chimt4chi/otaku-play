import React from 'react';
import AnimeCard from '../components/AnimeCard';
import SectionHeader from '../components/SectionHeader';
import { Bookmark, Film } from 'lucide-react';

export default function WatchlistView({
  watchlist = [],
  onWatchAnime,
  onViewDetails
}) {
  return (
    <div className="section-wrapper page-section">
      <SectionHeader
        title="My Watchlist"
        as="h1"
        icon={Bookmark}
        subtitle={`${watchlist.length} saved ${watchlist.length === 1 ? 'title' : 'titles'}`}
      />

      {watchlist.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <Film size={30} />
          </div>
          <h3 className="empty-state-title">Your Watchlist is empty</h3>
          <p className="empty-state-text">
            Browse through popular or trending anime and tap Watchlist to save titles for later.
          </p>
        </div>
      ) : (
        <div className="anime-grid">
          {watchlist.map(anime => (
            <AnimeCard
              key={anime.id}
              anime={anime}
              isBookmarked={true}
              onWatch={onWatchAnime}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}
