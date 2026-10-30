import React, { useEffect, useState } from 'react';
import { X, Play, Star, Bookmark, Calendar, Film, Layers, UserCheck, Download } from 'lucide-react';
import { getAnimeDetails } from '../services/api';
import AnimeCard from './AnimeCard';
import DownloadModal from './DownloadModal';

export default function AnimeDetailModal({
  anime,
  onClose,
  onWatch,
  onToggleWatchlist,
  isBookmarked = false
}) {
  const [details, setDetails] = useState(anime);
  const [loading, setLoading] = useState(true);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAnimeDetails(anime.id).then(fullData => {
      if (active) {
        setDetails(fullData);
        setLoading(false);
      }
    }).catch(() => {
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
    <div className="search-modal-backdrop" onClick={onClose}>
      <div
        className="search-modal-box detail-modal-box"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Banner Image */}
        <div className="detail-modal-banner-wrap">
          <img
            src={banner}
            alt={title}
            className="detail-modal-banner"
          />
          <div className="detail-modal-banner-gradient" />

          <button
            className="icon-btn detail-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="detail-modal-body">
          <div className="detail-modal-intro">
            <img
              src={poster}
              alt={title}
              className="detail-modal-poster"
            />

            <div className="detail-modal-info">
              <div className="detail-modal-badges">
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

              <h2 className="detail-modal-title">
                {title}
              </h2>
              {details.title?.native && (
                <div className="detail-modal-native">
                  {details.title.native}
                </div>
              )}

              <div className="detail-modal-actions">
                <button
                  className="btn-primary"
                  onClick={() => onWatch(details, 1)}
                >
                  <Play size={16} fill="currentColor" />
                  <span>Start Watching</span>
                </button>

                <button
                  className="btn-secondary"
                  onClick={() => onToggleWatchlist(details)}
                >
                  <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} color={isBookmarked ? 'var(--accent-color)' : 'inherit'} />
                  <span>{isBookmarked ? 'In Watchlist' : 'Watchlist'}</span>
                </button>

                <button
                  className="btn-secondary"
                  onClick={() => setIsDownloadOpen(true)}
                  title="Download episode offline"
                >
                  <Download size={16} />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>

          {/* Synopsis */}
          <div className="detail-modal-section">
            <h4 className="detail-modal-heading">
              Synopsis
            </h4>
            <p className="detail-modal-synopsis">
              {details.description?.replace(/<[^>]*>?/gm, '') || 'No synopsis available for this title.'}
            </p>
          </div>

          {/* Genres */}
          {details.genres && (
            <div className="detail-modal-section">
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {details.genres.map(genre => (
                  <span key={genre} className="badge" style={{ fontSize: '0.72rem' }}>
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Characters & Voice Actors Section */}
          {characters.length > 0 && (
            <div className="detail-modal-section">
              <h4 className="detail-modal-heading">
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
                        loading="lazy"
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
                            <img src={va.image.large} alt={va.name?.full} className="va-avatar" loading="lazy" />
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
            <div className="detail-modal-section">
              <h4 className="detail-modal-heading">
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

      <DownloadModal
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
        anime={details}
        currentEpisode={1}
        currentTrack="sub"
        server="zoko"
      />
    </div>
  );
}
