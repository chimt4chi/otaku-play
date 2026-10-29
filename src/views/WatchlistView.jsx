import React from 'react';
import AnimeCard from '../components/AnimeCard';
import { Bookmark, Film } from 'lucide-react';

export default function WatchlistView({ 
  watchlist = [], 
  onWatchAnime, 
  onViewDetails 
}) {
  return (
    <div className="section-wrapper" style={{ marginTop: '2rem' }}>
      <div className="section-header">
        <div className="section-title-group">
          <div className="section-indicator" />
          <h1 className="section-title">My Watchlist</h1>
        </div>
        <div className="section-subtitle">
          <Bookmark size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
          {watchlist.length} saved titles
        </div>
      </div>

      {watchlist.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '6rem 1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <Film size={48} color="var(--text-dim)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Your Watchlist is empty</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
            Browse through popular or trending anime and click the bookmark button to save them here for later.
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
