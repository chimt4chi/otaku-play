import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Star, Film, Play, Layers } from 'lucide-react';
import { searchAnime, ALL_GENRES } from '../services/api';

export default function SearchModal({
  isOpen,
  onClose,
  onSelectAnime,
  onWatchAnime
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setSearchTerm('');
      setResults([]);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setLoading(true);
      searchAnime(searchTerm, 1, 25, selectedGenre).then(data => {
        setResults(data);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedGenre, isOpen]);

  // Keyboard shortcut for Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="search-modal-backdrop" onClick={onClose}>
      <div 
        className="search-modal-box" 
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="search-input-header">
          <div className="search-icon-badge">
            <Search size={18} />
          </div>

          <input
            ref={inputRef}
            type="text"
            className="search-main-input"
            placeholder="Search anime title, Japanese name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            aria-label="Search anime"
          />

          {searchTerm && (
            <button 
              type="button"
              className="icon-btn" 
              onClick={() => setSearchTerm('')} 
              style={{ width: '32px', height: '32px' }}
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}

          <button 
            type="button"
            className="icon-btn" 
            onClick={onClose}
            title="Close"
            aria-label="Close search"
          >
            <X size={18} />
          </button>
        </div>

        {/* Polished Genre Filter Bar */}
        <div className="search-genre-bar">
          {['All', ...ALL_GENRES].map(genre => {
            const isActive = selectedGenre === genre;
            return (
              <button
                key={genre}
                type="button"
                onClick={() => setSelectedGenre(genre)}
                className={`genre-pill ${isActive ? 'active' : ''}`}
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem', flexShrink: 0 }}
              >
                {genre === 'All' ? 'All Genres' : genre}
              </button>
            );
          })}
        </div>

        {/* Results Header Status */}
        <div className="search-status-bar">
          <span>
            {loading ? 'Searching anime...' : `${results.length} results found`}
          </span>
          <span style={{ color: 'var(--accent-color)' }}>Franchises Combined</span>
        </div>

        {/* Results List */}
        <div className="search-results-list">
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3.5rem' }}>
              <div className="player-spinner" style={{ width: '36px', height: '36px' }} />
            </div>
          )}

          {!loading && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
              <Film size={40} color="var(--text-dim)" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: '#f8fafc', marginBottom: '0.35rem' }}>
                No anime found
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', maxWidth: '400px', margin: '0 auto' }}>
                Try searching for titles like "Attack on Titan", "Demon Slayer", "Jujutsu Kaisen", or select a genre above.
              </p>
            </div>
          )}

          {!loading && results.map(anime => {
            const title = anime.title?.english || anime.title?.romaji;
            const poster = anime.coverImage?.large || anime.coverImage?.extraLarge;
            const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
            const seasons = anime.seasons || [];
            const seasonCount = anime.seasonCount || seasons.length || 1;
            const totalEpisodes = anime.totalEpisodes || anime.episodes;

            return (
              <div 
                key={anime.id} 
                className="search-result-card"
                onClick={() => {
                  onSelectAnime(anime);
                  onClose();
                }}
              >
                {/* Poster */}
                <div className="search-card-poster-wrap">
                  <img 
                    src={poster} 
                    alt={title} 
                    className="search-card-poster"
                    loading="lazy" 
                  />
                  {seasonCount > 1 && (
                    <span className="search-card-season-pill">
                      {seasonCount}S
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="search-card-info">
                  <div className="search-card-title-row">
                    <h3 className="search-card-title" title={title}>
                      {title}
                    </h3>

                    {seasonCount > 1 ? (
                      <span className="badge badge-brand" style={{ fontSize: '0.65rem', padding: '0.12rem 0.45rem' }}>
                        <Layers size={10} style={{ marginRight: '3px' }} />
                        {seasonCount}S
                      </span>
                    ) : (
                      <span className="badge" style={{ fontSize: '0.62rem' }}>
                        TV
                      </span>
                    )}
                  </div>

                  {/* Season list preview chips */}
                  {seasonCount > 1 && (
                    <div className="search-card-seasons-scroll">
                      {seasons.slice(0, 3).map((s, idx) => (
                        <span key={s.id || idx} className="search-card-season-chip">
                          {s.seasonName || `S${idx + 1}`} ({s.episodes || '?'} ep)
                        </span>
                      ))}
                      {seasons.length > 3 && (
                        <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', alignSelf: 'center' }}>
                          +{seasons.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Meta tags */}
                  <div className="search-card-meta">
                    {score && (
                      <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 700 }}>
                        <Star size={11} fill="currentColor" />
                        {score}
                      </span>
                    )}
                    <span>•</span>
                    <span>{anime.format || 'TV'}</span>
                    <span>•</span>
                    <span>{totalEpisodes ? `${totalEpisodes} Ep` : 'Ongoing'}</span>
                    {anime.genres && (
                      <>
                        <span>•</span>
                        <span>{anime.genres[0]}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Quick Watch Button */}
                <button
                  type="button"
                  className="btn-primary search-card-watch-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onWatchAnime?.(anime, 1);
                    onClose();
                  }}
                  title={`Watch ${title}`}
                >
                  <Play size={13} fill="currentColor" />
                  <span className="search-watch-text">Watch</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
