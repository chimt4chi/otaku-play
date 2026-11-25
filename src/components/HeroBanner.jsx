import React, { useState, useEffect, useRef } from 'react';
import { Play, Info, Star, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

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

  // Auto-advance & preload next slide image for zero-flicker transitions
  useEffect(() => {
    if (count < 2) return;
    const nextItem = featuredList[(currentIndex + 1) % count];
    const nextImg = nextItem?.bannerImage || nextItem?.coverImage?.extraLarge || nextItem?.coverImage?.large;
    if (nextImg) {
      const preload = new Image();
      preload.src = nextImg;
    }

    if (paused) return;
    const timer = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % count);
    }, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [count, currentIndex, paused, featuredList]);

  if (!count) return null;

  const goTo = (delta) => setCurrentIndex(prev => (prev + delta + count) % count);

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
      goTo(dx < 0 ? 1 : -1);
    }
  };

  const handleTouchCancel = () => {
    touchStartRef.current = null;
    setPaused(false);
  };

  const current = featuredList[currentIndex] || featuredList[0];
  const title = current.title?.english || current.title?.romaji || 'Anime';
  const banner = current.bannerImage || current.coverImage?.extraLarge || current.coverImage?.large;
  const isPosterFallback = !current.bannerImage;
  const score = current.averageScore ? (current.averageScore / 10).toFixed(1) : '9.2';

  const metaParts = [
    current.format,
    current.episodes ? `${current.episodes} Ep` : null,
    current.seasonYear
  ].filter(Boolean);

  return (
    <section
      className="hero-container"
      aria-label="Featured Anime"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background Banner Image */}
      <img
        src={banner}
        alt=""
        className={`hero-backdrop-img ${isPosterFallback ? 'is-poster' : ''}`}
        fetchPriority="high"
        decoding="async"
        draggable={false}
      />
      <div className="hero-gradient-overlay" />

      {/* Desktop Prev/Next Controls */}
      {count > 1 && (
        <>
          <button
            type="button"
            className="hero-arrow prev"
            onClick={() => goTo(-1)}
            aria-label="Previous featured anime"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="hero-arrow next"
            onClick={() => goTo(1)}
            aria-label="Next featured anime"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Editorial Content */}
      <div className="hero-content" key={current.id}>
        <div className="hero-meta-badges">
          <span className="badge badge-brand">
            <Sparkles size={11} />
            Trending #{currentIndex + 1}
          </span>
          <span className="badge badge-score">
            <Star size={11} fill="currentColor" />
            {score}
          </span>
          {metaParts.length > 0 && (
            <span className="hero-meta-inline">
              {metaParts.join(' · ')}
            </span>
          )}
          <span className="badge badge-track hide-on-mobile">SUB · DUB</span>
        </div>

        <h1 className="hero-title">{title}</h1>

        <p className="hero-synopsis">
          {current.description?.replace(/<[^>]*>?/gm, '') || 'Immerse into the epic saga with breathtaking visuals and gripping battles.'}
        </p>

        {current.genres?.length > 0 && (
          <div className="hero-genres hide-on-mobile">
            {current.genres.slice(0, 4).map(genre => (
              <span key={genre} className="hero-genre-chip">{genre}</span>
            ))}
          </div>
        )}

        <div className="hero-actions">
          <button type="button" className="btn-primary" onClick={() => onWatch(current, 1)}>
            <Play size={17} fill="currentColor" />
            <span>Watch Now</span>
          </button>

          <button type="button" className="btn-secondary" onClick={() => onViewDetails(current)}>
            <Info size={17} />
            <span>More Info</span>
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
                className={`hero-dot ${idx === currentIndex ? 'active' : ''} ${paused ? 'is-paused' : ''}`}
                onClick={() => setCurrentIndex(idx)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
