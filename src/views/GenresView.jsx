import React, { useState, useEffect } from 'react';
import { ALL_GENRES, getAnimeByGenre } from '../services/api';
import AnimeCard from '../components/AnimeCard';
import { Compass } from 'lucide-react';

export default function GenresView({ onWatchAnime, onViewDetails }) {
  const [activeGenre, setActiveGenre] = useState('Action');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

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
    <div className="section-wrapper" style={{ marginTop: '2rem' }}>
      <div className="section-header">
        <div className="section-title-group">
          <div className="section-indicator" />
          <h1 className="section-title">Explore By Genre</h1>
        </div>
        <div className="section-subtitle">
          <Compass size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
          Discover titles in {activeGenre}
        </div>
      </div>

      <div className="genre-pills-wrap">
        {ALL_GENRES.map(genre => (
          <button
            key={genre}
            className={`genre-pill ${activeGenre === genre ? 'active' : ''}`}
            onClick={() => setActiveGenre(genre)}
          >
            {genre}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
          <div className="player-spinner" />
        </div>
      ) : (
        <div className="anime-grid">
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
