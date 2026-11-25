import React from 'react';
import { Play, Star } from 'lucide-react';

function AnimeCard({
  anime,
  onWatch,
  onViewDetails,
  ranking = null
}) {
  const title = anime.title?.english || anime.title?.romaji || 'Anime';
  const poster = anime.coverImage?.large || anime.coverImage?.extraLarge || '/placeholder.svg';
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;

  const handleKeyDown = (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onViewDetails(anime);
    }
  };

  return (
    <div
      className="anime-card"
      role="button"
      tabIndex={0}
      aria-label={`${title}. View details`}
      onClick={() => onViewDetails(anime)}
      onKeyDown={handleKeyDown}
    >
      <div className="card-poster-wrap">
        <img
          src={poster}
          alt=""
          className="card-poster"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        <div className="card-poster-scrim" aria-hidden="true" />

        {/* Ranking or Format badge */}
        {ranking ? (
          <div className="card-overlay-badge">
            <span className="card-rank-pill">#{ranking}</span>
          </div>
        ) : anime.format ? (
          <div className="card-overlay-badge">
            <span className="card-format-pill">{anime.format}</span>
          </div>
        ) : null}

        {/* Score Badge */}
        {score && (
          <div className="card-score-badge">
            <Star size={11} fill="currentColor" />
            <span>{score}</span>
          </div>
        )}

        {/* Quick Play Hover Button (mouse devices) */}
        <div className="card-quick-play">
          <button
            type="button"
            className="card-quick-play-btn"
            onClick={(e) => {
              e.stopPropagation();
              onWatch(anime, 1);
            }}
            title="Play Episode 1"
            aria-label={`Play ${title} episode 1`}
          >
            <Play size={19} fill="currentColor" style={{ marginLeft: '2px' }} />
          </button>
        </div>

        {/* Always-visible play shortcut (touch devices, where hover does not exist) */}
        <button
          type="button"
          className="card-touch-play"
          onClick={(e) => {
            e.stopPropagation();
            onWatch(anime, 1);
          }}
          aria-label={`Play ${title} episode 1`}
        >
          <Play size={15} fill="currentColor" style={{ marginLeft: '2px' }} />
        </button>
      </div>

      <div className="card-body">
        <h4 className="card-title" title={title}>{title}</h4>
        <div className="card-meta">
          <span>{anime.episodes ? `${anime.episodes} Ep` : 'Ongoing'}</span>
          {anime.genres?.[0] && <span>{anime.genres[0]}</span>}
        </div>
      </div>
    </div>
  );
}

export default React.memo(AnimeCard);
