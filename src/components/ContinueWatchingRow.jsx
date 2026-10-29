import React from 'react';
import { Play, X, Clock } from 'lucide-react';

export default function ContinueWatchingRow({ 
  items = [], 
  onResume, 
  onRemove 
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="section-wrapper">
      <div className="section-header">
        <div className="section-title-group">
          <div className="section-indicator" />
          <h2 className="section-title">Continue Watching</h2>
        </div>
        <div className="section-subtitle">
          <Clock size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
          Pick up where you left off
        </div>
      </div>

      <div className="carousel-row">
        {items.map((item) => {
          const title = item.title?.english || item.title?.romaji || 'Anime';
          const thumb = item.bannerImage || item.coverImage?.large || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600';
          const progress = Math.max(5, Math.min(100, item.progressPercent || 0));

          return (
            <div 
              key={`${item.id}-${item.episode}`} 
              className="continue-card"
              onClick={() => onResume(item, item.episode, item.currentTime)}
            >
              <div className="continue-thumb-wrap">
                <img src={thumb} alt={title} className="continue-thumb" loading="lazy" />
                <div className="card-quick-play">
                  <div className="card-quick-play-btn">
                    <Play size={18} fill="currentColor" style={{ marginLeft: '2px' }} />
                  </div>
                </div>
                <div className="continue-progress-bar-wrap">
                  <div 
                    className="continue-progress-bar-fill" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              </div>

              <div className="continue-details">
                <div className="continue-info">
                  <h4 className="continue-title" title={title}>{title}</h4>
                  <div className="continue-ep">Episode {item.episode} • {progress}% watched</div>
                </div>

                <button 
                  className="continue-remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.id);
                  }}
                  title="Remove from history"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
