import React, { useState, useEffect } from 'react';
import HeroBanner from '../components/HeroBanner';
import ContinueWatchingRow from '../components/ContinueWatchingRow';
import GenreSection from '../components/GenreSection';
import AnimeCard from '../components/AnimeCard';
import { 
  getTrendingAnime, 
  getPopularAnime, 
  getTopRatedAnime 
} from '../services/api';
import { Flame, Star, Sparkles, ChevronRight } from 'lucide-react';

function CardRowSkeleton({ count = 6 }) {
  return (
    <div className="carousel-row" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton-card" />
      ))}
    </div>
  );
}

function SectionHeader({ title, icon: Icon, subtitle, onSeeAll }) {
  return (
    <div className="section-header">
      <div className="section-title-group">
        <div className="section-indicator" />
        <h2 className="section-title">{title}</h2>
      </div>
      {subtitle && (
        <div className="section-subtitle hide-on-mobile">
          <Icon size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
          {subtitle}
        </div>
      )}
      {onSeeAll && (
        <button type="button" className="section-link" onClick={onSeeAll}>
          <span>See all</span>
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

export default function HomeView({
  continueWatchingList = [],
  onResumeWatching,
  onRemoveContinueWatching,
  onWatchAnime,
  onViewDetails,
  onNavigate
}) {
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      getTrendingAnime(1, 10),
      getPopularAnime(1, 10),
      getTopRatedAnime(1, 10)
    ]).then(([trendData, popData, topData]) => {
      if (active) {
        setTrending(trendData);
        setPopular(popData);
        setTopRated(topData);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, []);

  return (
    <div>
      {/* Hero Featured Carousel Banner */}
      {loading ? (
        <div className="hero-container skeleton skeleton-hero" aria-hidden="true" />
      ) : (
        <HeroBanner 
          featuredList={trending.length > 0 ? trending.slice(0, 5) : []}
          onWatch={onWatchAnime}
          onViewDetails={onViewDetails}
        />
      )}

      {/* Continue Watching Section */}
      <ContinueWatchingRow 
        items={continueWatchingList}
        onResume={onResumeWatching}
        onRemove={onRemoveContinueWatching}
      />

      {/* Watch by Genre Section */}
      <GenreSection 
        onWatch={onWatchAnime}
        onViewDetails={onViewDetails}
      />

      {/* Popular Anime Section */}
      {(loading || popular.length > 0) && (
        <div className="section-wrapper">
          <SectionHeader
            title="Popular Anime"
            icon={Flame}
            subtitle="Most watched by the community"
            onSeeAll={() => onNavigate?.('popular')}
          />

          {loading ? <CardRowSkeleton /> : (
            <div className="carousel-row">
              {popular.map((anime, idx) => (
                <AnimeCard 
                  key={anime.id} 
                  anime={anime} 
                  ranking={idx + 1}
                  onWatch={onWatchAnime} 
                  onViewDetails={onViewDetails} 
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Top Anime Section */}
      {(loading || topRated.length > 0) && (
        <div className="section-wrapper">
          <SectionHeader
            title="Top Rated Anime"
            icon={Star}
            subtitle="Highest scored masterpieces of all time"
            onSeeAll={() => onNavigate?.('top')}
          />

          {loading ? <CardRowSkeleton /> : (
            <div className="carousel-row">
              {topRated.map(anime => (
                <AnimeCard 
                  key={anime.id} 
                  anime={anime} 
                  onWatch={onWatchAnime} 
                  onViewDetails={onViewDetails} 
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trending Now Row */}
      {(loading || trending.length > 0) && (
        <div className="section-wrapper">
          <SectionHeader
            title="Trending This Season"
            icon={Sparkles}
            subtitle="Hot releases buzzing right now"
          />

          {loading ? <CardRowSkeleton /> : (
            <div className="carousel-row">
              {trending.map(anime => (
                <AnimeCard 
                  key={anime.id} 
                  anime={anime} 
                  onWatch={onWatchAnime} 
                  onViewDetails={onViewDetails} 
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
