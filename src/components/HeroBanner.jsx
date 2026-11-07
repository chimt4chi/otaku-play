import React, { useState, useEffect, useRef } from 'react';
import { Play, Info, Star, Sparkles } from 'lucide-react';

const AUTOPLAY_MS = 7000;
const SWIPE_MIN_PX = 50;

export default function HeroBanner({ 
  featuredList = [], 
  onWatch, 
  onViewDetails 
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartRef = useRef(null);
  const count = featuredList.length;

  // Auto-advance. Restarts after every manual change and pauses while a finger is down.
  useEffect(() => {
    if (count < 2 || paused) return;
    const timer = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % count);
    }, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [count, currentIndex, paused]);

  if (!count) return null;

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    setPaused(true);
  };

  const handleTouchEnd = (e) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    setPaused(false);
    if (!start || count < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      setCurrentIndex(prev => (prev + (dx < 0 ? 1 : -1) + count) % count);
    }
  };

  const handleTouchCancel = () => {
    touchStartRef.current = null;
    setPaused(false);
  };

  const current = featuredList[currentIndex] || featuredList[0];
  const title = current.title?.english || current.title?.romaji || 'Anime';
  const banner = current.bannerImage || current.coverImage?.extraLarge || current.coverImage?.large;
  const score = current.averageScore ? (current.averageScore / 10).toFixed(1) : '9.2';

  return (
    <div
      className="hero-container"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {/* Background Banner Image */}
      <img 
        src={banner} 
        alt="" 
        className="hero-backdrop-img"
        key={current.id}
        fetchPriority="high"
        decoding="async"
        draggable={false}
      />
      <div className="hero-gradient-overlay" />

      {/* Content */}
      <div className="hero-content">
        <div className="hero-meta-badges">
          <span className="badge badge-brand">
            <Sparkles size={12} />
            Trending #{currentIndex + 1}
          </span>
          <span className="badge badge-score">
            <Star size={12} fill="currentColor" />
            {score} Score
          </span>
          {current.format && (
            <span className="badge">
              {current.format}
            </span>
          )}
          {current.episodes && (
            <span className="badge hide-on-mobile">
              {current.episodes} Episodes
            </span>
          )}
          {current.seasonYear && (
            <span className="badge hide-on-mobile">
              {current.seasonYear}
            </span>
          )}
          <span className="badge hide-on-mobile" style={{ color: 'var(--accent-color)', borderColor: 'var(--accent-color)' }}>
            SUB · DUB
          </span>
        </div>

        <h1 className="hero-title">
          {title}
        </h1>

        <p className="hero-synopsis">
          {current.description?.replace(/<[^>]*>?/gm, '') || 'Immerse into the epic saga with breathtaking visuals and gripping battles.'}
        </p>

        {current.genres && (
          <div className="hero-genres hide-on-mobile">
            {current.genres.slice(0, 4).map(genre => (
              <span key={genre} style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                #{genre}
              </span>
            ))}
          </div>
        )}

        <div className="hero-actions">
          <button 
            className="btn-primary"
            onClick={() => onWatch(current, 1)}
          >
            <Play size={18} fill="currentColor" />
            <span>Watch Now<span className="hide-on-mobile"> (Ep 1)</span></span>
          </button>

          <button 
            className="btn-secondary"
            onClick={() => onViewDetails(current)}
          >
            <Info size={18} />
            <span><span className="hide-on-mobile">Characters & </span>Info</span>
          </button>
        </div>

        {/* Carousel Slide Indicators */}
        {count > 1 && (
          <div className="hero-dots" role="tablist" aria-label="Featured anime">
            {featuredList.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={idx === currentIndex}
                aria-label={`Show featured anime ${idx + 1}`}
                className={`hero-dot ${idx === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(idx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
