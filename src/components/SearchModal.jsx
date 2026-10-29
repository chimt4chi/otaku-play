import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Star, Film, Sparkles, Play, Layers } from 'lucide-react';
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
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '88vh',
          backgroundColor: '#0c0f18',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '16px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.9), 0 0 40px var(--accent-glow)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Search Input Bar */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1.2rem 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: '#111522'
          }}
        >
          <div 
            style={{ 
              display: 'grid', 
              placeItems: 'center', 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--accent-soft)', 
              color: 'var(--accent-color)',
              flexShrink: 0
            }}
          >
            <Search size={20} />
          </div>

          <input
            ref={inputRef}
            type="text"
            className="search-main-input"
            placeholder="Search anime title, franchise, Japanese name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#f8fafc',
              outline: 'none',
              letterSpacing: '-0.01em'
            }}
          />

          {searchTerm && (
            <button 
              type="button"
              className="icon-btn" 
              onClick={() => setSearchTerm('')} 
              style={{ width: '32px', height: '32px' }}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}

          <button 
            type="button"
            className="icon-btn" 
            onClick={onClose}
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Polished Genre Filter Bar */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.85rem 1.5rem',
            overflowX: 'auto',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: '#090b12',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {['All', ...ALL_GENRES].map(genre => {
            const isActive = selectedGenre === genre;
            return (
              <button
                key={genre}
                type="button"
                onClick={() => setSelectedGenre(genre)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.45rem 1rem',
                  minHeight: '34px',
                  borderRadius: '9999px',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  lineHeight: '1',
                  border: isActive ? '1px solid var(--accent-color)' : '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: isActive ? 'var(--accent-color)' : '#121624',
                  color: isActive ? 'var(--text-inverse)' : '#94a3b8',
                  boxShadow: isActive ? '0 0 14px var(--accent-glow)' : 'none',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box'
                }}
              >
                {genre === 'All' ? 'All Genres' : genre}
              </button>
            );
          })}
        </div>

        {/* Results Header Status */}
        <div 
          style={{ 
            padding: '0.65rem 1.5rem', 
            backgroundColor: '#0e121d', 
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            fontSize: '0.75rem', 
            fontFamily: 'var(--font-mono)', 
            color: 'var(--text-dim)' 
          }}
        >
          <span>
            {loading ? 'Searching anime franchises...' : `${results.length} franchises found`}
          </span>
          <span style={{ color: 'var(--accent-color)' }}>Seasons Combined into 1 Card</span>
        </div>

        {/* Results List */}
        <div 
          className="search-results-list"
          style={{
            padding: '1.25rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            backgroundColor: '#07080d',
            maxHeight: '62vh'
          }}
        >
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3.5rem' }}>
              <div className="player-spinner" style={{ width: '38px', height: '38px' }} />
            </div>
          )}

          {!loading && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted)' }}>
              <Film size={44} color="var(--text-dim)" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem', color: '#f8fafc', marginBottom: '0.35rem' }}>
                No anime found
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', maxWidth: '420px', margin: '0 auto' }}>
                Try searching for titles like "Attack on Titan", "Demon Slayer", "Jujutsu Kaisen", or click a genre above.
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  padding: '0.9rem 1.25rem',
                  backgroundColor: '#101422',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  position: 'relative'
                }}
              >
                {/* Poster */}
                <div 
                  style={{ 
                    position: 'relative', 
                    width: '64px', 
                    height: '92px', 
                    borderRadius: '8px', 
                    overflow: 'hidden', 
                    flexShrink: 0,
                    backgroundColor: '#07080d',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6)'
                  }}
                >
                  <img 
                    src={poster} 
                    alt={title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    loading="lazy" 
                  />
                  {seasonCount > 1 && (
                    <span 
                      style={{
                        position: 'absolute',
                        bottom: '3px',
                        right: '3px',
                        backgroundColor: 'var(--accent-color)',
                        color: 'var(--text-inverse)',
                        fontSize: '0.65rem',
                        fontWeight: 900,
                        fontFamily: 'var(--font-mono)',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '3px',
                        boxShadow: '0 0 8px rgba(0,0,0,0.8)'
                      }}
                    >
                      {seasonCount}S
                    </span>
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <h3 
                      style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: 800, 
                        color: '#f8fafc', 
                        margin: 0, 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis' 
                      }}
                    >
                      {title}
                    </h3>

                    {seasonCount > 1 ? (
                      <span 
                        className="badge badge-brand" 
                        style={{ fontSize: '0.68rem', padding: '0.15rem 0.55rem' }}
                      >
                        <Layers size={11} style={{ marginRight: '3px' }} />
                        {seasonCount} Seasons Combined
                      </span>
                    ) : (
                      <span className="badge" style={{ fontSize: '0.65rem' }}>
                        Single Series
                      </span>
                    )}
                  </div>

                  {/* Season list preview chips */}
                  {seasonCount > 1 && (
                    <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', padding: '0.1rem 0', scrollbarWidth: 'none' }}>
                      {seasons.slice(0, 4).map((s, idx) => (
                        <span 
                          key={s.id || idx} 
                          style={{
                            fontSize: '0.68rem',
                            fontFamily: 'var(--font-mono)',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: '#171c2f',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: '#94a3b8',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {s.seasonName || `S${idx + 1}`} ({s.episodes || '?'} Ep)
                        </span>
                      ))}
                      {seasons.length > 4 && (
                        <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', alignSelf: 'center' }}>
                          +{seasons.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Meta tags */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.78rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                    {score && (
                      <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 700 }}>
                        <Star size={11} fill="currentColor" />
                        {score}
                      </span>
                    )}
                    <span>•</span>
                    <span>{anime.format || 'TV'}</span>
                    <span>•</span>
                    <span>{totalEpisodes ? `${totalEpisodes} Episodes Total` : 'Ongoing'}</span>
                    {anime.seasonYear && (
                      <>
                        <span>•</span>
                        <span>{anime.seasonYear}</span>
                      </>
                    )}
                    {anime.genres && (
                      <>
                        <span>•</span>
                        <span>{anime.genres.slice(0, 3).join(', ')}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Quick Watch Button */}
                <button
                  type="button"
                  className="btn-primary"
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.75rem',
                    flexShrink: 0,
                    borderRadius: '8px'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onWatchAnime?.(anime, 1);
                    onClose();
                  }}
                >
                  <Play size={13} fill="currentColor" />
                  <span>Watch</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
