import React, { useState, useEffect } from 'react';
import { Play, Info, Star, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export default function HeroBanner({ 
  featuredList = [], 
  onWatch, 
  onViewDetails 
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!featuredList.length) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % featuredList.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [featuredList.length]);

  if (!featuredList.length) return null;

  const current = featuredList[currentIndex];
  const title = current.title?.english || current.title?.romaji || 'Anime';
  const banner = current.bannerImage || current.coverImage?.extraLarge || current.coverImage?.large;
  const score = current.averageScore ? (current.averageScore / 10).toFixed(1) : '9.2';

  return (
    <div className="hero-container">
      {/* Background Banner Image */}
      <img 
        src={banner} 
        alt={title} 
        className="hero-backdrop-img"
        key={current.id}
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
            <span className="badge">
              {current.episodes} Episodes
            </span>
          )}
          {current.seasonYear && (
            <span className="badge">
              {current.seasonYear}
            </span>
          )}
          <span className="badge" style={{ color: 'var(--accent-color)', borderColor: 'var(--accent-color)' }}>
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
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
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
            <span>Watch Now (Ep 1)</span>
          </button>

          <button 
            className="btn-secondary"
            onClick={() => onViewDetails(current)}
          >
            <Info size={18} />
            <span>Characters & Info</span>
          </button>
        </div>

        {/* Carousel Slide Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          {featuredList.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: idx === currentIndex ? '28px' : '8px',
                height: '8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: idx === currentIndex ? 'var(--accent-color)' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.3s ease',
                boxShadow: idx === currentIndex ? '0 0 10px var(--accent-glow)' : 'none'
              }}
              title={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
