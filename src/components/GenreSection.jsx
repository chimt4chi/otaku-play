import React, { useState, useEffect } from 'react';
import { ALL_GENRES, getAnimeByGenre } from '../services/api';
import AnimeCard from './AnimeCard';
import { Layers } from 'lucide-react';

export default function GenreSection({ onWatch, onViewDetails }) {
  const [selectedGenre, setSelectedGenre] = useState('Action');
  const [animeList, setAnimeList] = useState([]);
  const [loading, setLoading] = useState(false);

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
    <div className="section-wrapper">
      <div className="section-header">
        <div className="section-title-group">
          <div className="section-indicator" />
          <h2 className="section-title">Watch By Genre</h2>
        </div>
        <div className="section-subtitle">
          <Layers size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
          Explore top picks by themes
        </div>
      </div>

      {/* Genre Pills */}
      <div className="genre-pills-wrap">
        {ALL_GENRES.map((genre) => (
          <button
            key={genre}
            className={`genre-pill ${selectedGenre === genre ? 'active' : ''}`}
            onClick={() => setSelectedGenre(genre)}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Carousel or Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="player-spinner" />
        </div>
      ) : (
        <div className="carousel-row">
          {animeList.map(anime => (
            <AnimeCard 
              key={anime.id} 
              anime={anime} 
              onWatch={onWatch} 
              onViewDetails={onViewDetails} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
