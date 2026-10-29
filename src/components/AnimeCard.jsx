import React from 'react';
import { Play, Star, Plus, Check } from 'lucide-react';

export default function AnimeCard({
  anime,
  onWatch,
  onViewDetails,
  onToggleWatchlist,
  isBookmarked = false,
  ranking = null
}) {
  const title = anime.title?.english || anime.title?.romaji || 'Anime';
  const poster = anime.coverImage?.large || anime.coverImage?.extraLarge || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600';
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;

  return (
    <div className="anime-card" onClick={() => onViewDetails(anime)}>
      <div className="card-poster-wrap">
        <img
          src={poster}
          alt={title}
          className="card-poster"
          loading="lazy"
        />

        {/* Ranking or Format badge */}
        {ranking && (
          <div className="card-overlay-badge">
            <span className="badge badge-brand" style={{ fontSize: '0.7rem' }}>
              #{ranking}
            </span>
          </div>
        )}

        {!ranking && anime.format && (
          <div className="card-overlay-badge">
            <span className="badge" style={{ fontSize: '0.65rem' }}>
              {anime.format}
            </span>
          </div>
        )}

        {/* Score Badge */}
        {score && (
          <div className="card-score-badge">
            <Star size={11} fill="currentColor" />
            <span>{score}</span>
          </div>
        )}

        {/* Quick Play Hover Button */}
        <div className="card-quick-play">
          <button
            className="card-quick-play-btn"
            onClick={(e) => {
              e.stopPropagation();
              onWatch(anime, 1);
            }}
            title="Play Episode 1"
          >
            <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />
          </button>
        </div>
      </div>

      <div className="card-body">
        <h4 className="card-title" title={title}>
          {title}
        </h4>
        <div className="card-meta">
          <span>{anime.episodes ? `${anime.episodes} Ep` : 'Ongoing'}</span>
          <span>{anime.genres?.[0] || 'Anime'}</span>
        </div>
      </div>
    </div>
  );
}
