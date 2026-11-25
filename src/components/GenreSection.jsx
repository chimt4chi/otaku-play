import React, { useState, useEffect } from 'react';
import { ALL_GENRES, getAnimeByGenre } from '../services/api';
import AnimeCard from './AnimeCard';
import SectionHeader from './SectionHeader';
import CarouselRow, { CardRowSkeleton } from './CarouselRow';
import { Layers } from 'lucide-react';

export default function GenreSection({ onWatch, onViewDetails }) {
  const [selectedGenre, setSelectedGenre] = useState('Action');
  const [animeList, setAnimeList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAnimeByGenre(selectedGenre, 1, 10).then(data => {
      if (active) {
        setAnimeList(data);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [selectedGenre]);

  return (
    <section className="section-wrapper">
      <SectionHeader
        title="Browse by Genre"
        icon={Layers}
        subtitle={`Top picks in ${selectedGenre}`}
      />

      {/* Horizontal Genre Filter Strip */}
      <div className="genre-pills-wrap" role="tablist" aria-label="Anime genres">
        {ALL_GENRES.map((genre) => (
          <button
            key={genre}
            type="button"
            role="tab"
            aria-selected={selectedGenre === genre}
            className={`genre-pill ${selectedGenre === genre ? 'active' : ''}`}
            onClick={() => setSelectedGenre(genre)}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Show skeleton on first load; keep existing row subtly dimmed while switching genres to avoid layout jump */}
      {loading && animeList.length === 0 ? (
        <CardRowSkeleton />
      ) : (
        <div className={`carousel-fade-wrap ${loading ? 'is-loading' : ''}`}>
          <CarouselRow label={`${selectedGenre} Anime`}>
            {animeList.map(anime => (
              <AnimeCard
                key={anime.id}
                anime={anime}
                onWatch={onWatch}
                onViewDetails={onViewDetails}
              />
            ))}
          </CarouselRow>
        </div>
      )}
    </section>
  );
}
