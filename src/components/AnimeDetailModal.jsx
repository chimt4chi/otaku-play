import React, { useEffect, useState } from 'react';
import { X, Play, Star, Bookmark, Calendar, Film, Layers, UserCheck } from 'lucide-react';
import { getAnimeDetails } from '../services/api';
import AnimeCard from './AnimeCard';

export default function AnimeDetailModal({
  anime,
  onClose,
  onWatch,
  onToggleWatchlist,
  isBookmarked = false
}) {
  const [details, setDetails] = useState(anime);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAnimeDetails(anime.id).then(fullData => {
      if (active) {
        setDetails(fullData);
        setLoading(false);
      }
    }).catch(err => {
      if (active) {
        setLoading(false);
      }
    });

    return () => { active = false; };
  }, [anime.id]);

  if (!anime) return null;

  const title = details.title?.english || details.title?.romaji || 'Anime';
  const poster = details.coverImage?.large || details.coverImage?.extraLarge;
  const banner = details.bannerImage || poster;
  const score = details.averageScore ? (details.averageScore / 10).toFixed(1) : null;
  const characters = details.characters?.edges || [];
  const recommendations = details.recommendations?.nodes?.map(n => n.mediaRecommendation).filter(Boolean) || [];

  return (
    <div className="search-modal-backdrop" onClick={onClose} style={{ alignItems: 'center' }}>
      <div
        className="search-modal-box"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '900px', maxHeight: '90vh' }}
      >
        {/* Header with Banner Image */}
        <div style={{ position: 'relative', width: '100%', height: '220px', overflow: 'hidden' }}>
          <img
            src={banner}
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(14,17,26,0.3) 0%, var(--bg-surface) 100%)'
            }}
          />

          <button
            className="icon-btn"
            onClick={onClose}
            style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '0 2rem 2rem', overflowY: 'auto', marginTop: '-60px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <img
              src={poster}
              alt={title}
              style={{
                width: '140px',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--border-card)',
                boxShadow: 'var(--shadow-md)',
                backgroundColor: 'var(--bg-main)'
              }}
            />

            <div style={{ flex: 1, minWidth: '260px', marginTop: '60px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                {score && (
                  <span className="badge badge-score">
                    <Star size={12} fill="currentColor" />
                    {score}
                  </span>
                )}
                {details.format && <span className="badge">{details.format}</span>}
                {details.episodes && <span className="badge">{details.episodes} Ep</span>}
                {details.status && <span className="badge">{details.status}</span>}
              </div>

              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, textTransform: 'uppercase' }}>
                {title}
              </h2>
              {details.title?.native && (
                <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', marginBottom: '1rem' }}>
                  {details.title.native}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  className="btn-primary"
                  onClick={() => onWatch(details, 1)}
                  style={{ padding: '0.65rem 1.4rem', fontSize: '0.85rem' }}
                >
                  <Play size={16} fill="currentColor" />
                  <span>Start Watching</span>
                </button>

                <button
                  className="btn-secondary"
                  onClick={() => onToggleWatchlist(details)}
                  style={{ padding: '0.65rem 1.2rem', fontSize: '0.85rem' }}
                >
                  <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} color={isBookmarked ? 'var(--accent-color)' : 'inherit'} />
                  <span>{isBookmarked ? 'In Watchlist' : 'Watchlist'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Synopsis */}
          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
              Synopsis
            </h4>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
              {details.description?.replace(/<[^>]*>?/gm, '') || 'No synopsis available for this title.'}
            </p>
          </div>

          {/* Genres */}
          {details.genres && (
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {details.genres.map(genre => (
                  <span key={genre} className="badge" style={{ fontSize: '0.72rem' }}>
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Characters and Voice Actors Section */}
          {characters.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={16} color="var(--accent-color)" />
                <span>Characters & Voice Actors</span>
              </h4>

              <div className="characters-roster-grid">
                {characters.slice(0, 6).map(({ role, node: char, voiceActors }) => {
                  const va = voiceActors?.[0];
                  return (
                    <div key={char.id} className="character-card">
                      <img
                        src={char.image?.large}
                        alt={char.name?.full}
                        className="char-avatar-img"
                      />
                      <div className="char-info">
                        <div className="char-role-badge">{role}</div>
                        <div className="char-name">{char.name?.full}</div>
                        {char.name?.native && <div className="char-native">{char.name.native}</div>}
                      </div>

                      {va && (
                        <div className="va-info">
                          <div className="va-details">
                            <div className="va-name">{va.name?.full}</div>
                            <div className="va-label">Japanese VA</div>
                          </div>
                          {va.image?.large && (
                            <img src={va.image.large} alt={va.name?.full} className="va-avatar" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem' }}>
                You Might Also Like
              </h4>
              <div className="carousel-row">
                {recommendations.slice(0, 6).map(rec => (
                  <AnimeCard
                    key={rec.id}
                    anime={rec}
                    onWatch={onWatch}
                    onViewDetails={(a) => setDetails(a)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
