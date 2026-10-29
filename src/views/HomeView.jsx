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
import { Flame, Star, Sparkles, Compass } from 'lucide-react';

export default function HomeView({
  continueWatchingList = [],
  onResumeWatching,
  onRemoveContinueWatching,
  onWatchAnime,
  onViewDetails
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
      <HeroBanner 
        featuredList={trending.length > 0 ? trending.slice(0, 5) : []}
        onWatch={onWatchAnime}
        onViewDetails={onViewDetails}
      />

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
      <div className="section-wrapper">
        <div className="section-header">
          <div className="section-title-group">
            <div className="section-indicator" />
            <h2 className="section-title">Popular Anime</h2>
          </div>
          <div className="section-subtitle">
            <Flame size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            Most watched by the community
          </div>
        </div>

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
      </div>

      {/* Top Anime Section */}
      <div className="section-wrapper">
        <div className="section-header">
          <div className="section-title-group">
            <div className="section-indicator" />
            <h2 className="section-title">Top Rated Anime</h2>
          </div>
          <div className="section-subtitle">
            <Star size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            Highest scored masterpieces of all time
          </div>
        </div>

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
      </div>

      {/* Trending Now Row */}
      <div className="section-wrapper">
        <div className="section-header">
          <div className="section-title-group">
            <div className="section-indicator" />
            <h2 className="section-title">Trending This Season</h2>
          </div>
          <div className="section-subtitle">
            <Sparkles size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            Hot releases buzzing right now
          </div>
        </div>

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
      </div>
    </div>
  );
}
