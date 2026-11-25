import React, { useState, useEffect } from 'react';
import HeroBanner from '../components/HeroBanner';
import ContinueWatchingRow from '../components/ContinueWatchingRow';
import GenreSection from '../components/GenreSection';
import AnimeCard from '../components/AnimeCard';
import SectionHeader from '../components/SectionHeader';
import CarouselRow, { CardRowSkeleton } from '../components/CarouselRow';
import {
  getTrendingAnime,
  getPopularAnime,
  getTopRatedAnime
} from '../services/api';
import { Flame, Star, Sparkles } from 'lucide-react';

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
        <section className="section-wrapper">
          <SectionHeader
            title="Popular Anime"
            icon={Flame}
            subtitle="Most watched by the community"
            onSeeAll={() => onNavigate?.('popular')}
          />

          {loading ? <CardRowSkeleton /> : (
            <CarouselRow label="Popular Anime">
              {popular.map((anime, idx) => (
                <AnimeCard
                  key={anime.id}
                  anime={anime}
                  ranking={idx + 1}
                  onWatch={onWatchAnime}
                  onViewDetails={onViewDetails}
                />
              ))}
            </CarouselRow>
          )}
        </section>
      )}

      {/* Top Anime Section */}
      {(loading || topRated.length > 0) && (
        <section className="section-wrapper">
          <SectionHeader
            title="Top Rated"
            icon={Star}
            subtitle="Highest scored masterpieces of all time"
            onSeeAll={() => onNavigate?.('top')}
          />

          {loading ? <CardRowSkeleton /> : (
            <CarouselRow label="Top Rated Anime">
              {topRated.map(anime => (
                <AnimeCard
                  key={anime.id}
                  anime={anime}
                  onWatch={onWatchAnime}
                  onViewDetails={onViewDetails}
                />
              ))}
            </CarouselRow>
          )}
        </section>
      )}

      {/* Trending Now Row */}
      {(loading || trending.length > 0) && (
        <section className="section-wrapper">
          <SectionHeader
            title="Trending This Season"
            icon={Sparkles}
            subtitle="Hot releases buzzing right now"
          />

          {loading ? <CardRowSkeleton /> : (
            <CarouselRow label="Trending This Season">
              {trending.map(anime => (
                <AnimeCard
                  key={anime.id}
                  anime={anime}
                  onWatch={onWatchAnime}
                  onViewDetails={onViewDetails}
                />
              ))}
            </CarouselRow>
          )}
        </section>
      )}
    </div>
  );
}
