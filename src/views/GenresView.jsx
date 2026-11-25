import React, { useState, useEffect } from 'react';
import { ALL_GENRES, getAnimeByGenre } from '../services/api';
import AnimeCard from '../components/AnimeCard';
import SectionHeader from '../components/SectionHeader';
import { CardGridSkeleton } from '../components/CarouselRow';
import { Compass } from 'lucide-react';

export default function GenresView({ onWatchAnime, onViewDetails }) {
  const [activeGenre, setActiveGenre] = useState('Action');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAnimeByGenre(activeGenre, 1, 24).then(data => {
      if (active) {
        setList(data);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [activeGenre]);

  return (
    <div className="section-wrapper page-section">
      <SectionHeader
        title="Explore by Genre"
        as="h1"
        icon={Compass}
        subtitle={`Discover titles in ${activeGenre}`}
      />

      <div className="genre-pills-wrap" role="tablist" aria-label="Filter by genre">
        {ALL_GENRES.map(genre => (
          <button
            key={genre}
            type="button"
            role="tab"
            aria-selected={activeGenre === genre}
            className={`genre-pill ${activeGenre === genre ? 'active' : ''}`}
            onClick={() => setActiveGenre(genre)}
          >
            {genre}
          </button>
        ))}
      </div>

      {loading && list.length === 0 ? (
        <CardGridSkeleton />
      ) : (
        <div className={`anime-grid carousel-fade-wrap ${loading ? 'is-loading' : ''}`}>
          {list.map(anime => (
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
  );
}
