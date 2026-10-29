import React, { useState, useEffect } from 'react';
import { getTopRatedAnime } from '../services/api';
import AnimeCard from '../components/AnimeCard';
import { Star } from 'lucide-react';

export default function TopView({ onWatchAnime, onViewDetails }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getTopRatedAnime(1, 24).then(data => {
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
    <div className="section-wrapper" style={{ marginTop: '2rem' }}>
      <div className="section-header">
        <div className="section-title-group">
          <div className="section-indicator" />
          <h1 className="section-title">Top Rated Masterpieces</h1>
        </div>
        <div className="section-subtitle">
          <Star size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
          Critically acclaimed anime of all time
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
          <div className="player-spinner" />
        </div>
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
