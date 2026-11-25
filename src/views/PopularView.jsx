import React, { useState, useEffect } from 'react';
import { getPopularAnime } from '../services/api';
import AnimeCard from '../components/AnimeCard';
import SectionHeader from '../components/SectionHeader';
import { CardGridSkeleton } from '../components/CarouselRow';
import { Flame } from 'lucide-react';

export default function PopularView({ onWatchAnime, onViewDetails }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getPopularAnime(1, 24).then(data => {
      if (active) {
        setList(data);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, []);

  return (
    <div className="section-wrapper page-section">
      <SectionHeader
        title="Most Popular"
        as="h1"
        icon={Flame}
        subtitle="All-time most watched series"
      />

      {loading ? (
        <CardGridSkeleton />
      ) : (
        <div className="anime-grid">
          {list.map((anime, idx) => (
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
  );
}
