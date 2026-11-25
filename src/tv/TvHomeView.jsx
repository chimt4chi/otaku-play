import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Star } from 'lucide-react';
import {
  getTrendingAnime,
  getPopularAnime,
  getTopRatedAnime,
  getAnimeByGenre,
  getAnimeDetails,
  resolveEpisodeCount
} from '../services/api';

const GENRE_ROWS = ['Action', 'Fantasy', 'Romance', 'Comedy', 'Sci-Fi'];

const SOURCES = [
  { id: 'trending', title: 'Trending Now', load: () => getTrendingAnime(1, 16) },
  { id: 'popular', title: 'Popular on OtakuPlay', load: () => getPopularAnime(1, 16), ranked: true },
  { id: 'top', title: 'Top Rated', load: () => getTopRatedAnime(1, 16) },
  ...GENRE_ROWS.map(genre => ({ id: genre, title: genre, load: () => getAnimeByGenre(genre, 1, 16) })),
];

const titleOf = (a) => a?.title?.english || a?.title?.romaji || 'Anime';

// Netflix-style TV home: a billboard that follows the focused poster, above rows that
// scroll so the focused row sits at the top and the focused card at the left edge.
export default function TvHomeView({ continueWatchingList = [], onResumeWatching, onViewDetails }) {
  const [rows, setRows] = useState({});
  const [focused, setFocused] = useState(null);
  const [extra, setExtra] = useState({}); // details fetched for continue-watching entries
  const scrollerRef = useRef(null);

  useEffect(() => {
    let active = true;
    SOURCES.forEach(source => {
      source.load()
        .then(items => { if (active) setRows(prev => ({ ...prev, [source.id]: items })); })
        .catch(() => {});
    });
    return () => { active = false; };
  }, []);

  const billboard = focused || continueWatchingList[0] || rows.trending?.[0] || null;

  // Continue-watching entries are stored without a synopsis: fetch it for the billboard
  const needsDetails = billboard && !billboard.description ? billboard.id : null;
  useEffect(() => {
    if (!needsDetails) return undefined;
    let active = true;
    const timer = setTimeout(() => {
      getAnimeDetails(needsDetails)
        .then(d => { if (active && d) setExtra(prev => ({ ...prev, [needsDetails]: d })); })
        .catch(() => {});
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [needsDetails]);

  const hero = useMemo(
    () => (billboard ? { ...billboard, ...extra[billboard.id] } : null),
    [billboard, extra]
  );

  const handleFocus = (anime, event) => {
    setFocused(anime);
    const card = event.currentTarget;
    const track = card.parentElement;
    const row = track.parentElement;
    track.scrollTo({ left: card.offsetLeft - track.firstElementChild.offsetLeft, behavior: 'smooth' });
    scrollerRef.current?.scrollTo({ top: row.offsetTop, behavior: 'smooth' });
  };

  const backdrop = hero?.bannerImage || hero?.coverImage?.extraLarge || hero?.coverImage?.large;

  return (
    <div className="tv-home">
      <div className="tv-billboard">
        {backdrop && (
          <img
            key={backdrop}
            src={backdrop}
            alt=""
            className={`tv-billboard-art ${hero.bannerImage ? '' : 'poster'}`}
          />
        )}
        <div className="tv-billboard-shade" />
        {hero && (
          <div className="tv-billboard-info">
            <h1 className="tv-billboard-title">{titleOf(hero)}</h1>
            <div className="tv-billboard-meta">
              {hero.averageScore > 0 && (
                <span className="score"><Star size={13} fill="currentColor" /> {(hero.averageScore / 10).toFixed(1)}</span>
              )}
              {hero.seasonYear && <span>{hero.seasonYear}</span>}
              {hero.format && <span className="chip">{hero.format}</span>}
              <span>{resolveEpisodeCount(hero)} Episodes</span>
              {hero.genres?.length > 0 && <span>{hero.genres.slice(0, 3).join(' • ')}</span>}
            </div>
            <p className="tv-billboard-synopsis">{hero.description?.replace(/<[^>]*>?/gm, '')}</p>
          </div>
        )}
      </div>

      <div className="tv-rows" ref={scrollerRef}>
        {continueWatchingList.length > 0 && (
          <section className="tv-row">
            <h2 className="tv-row-title">Continue Watching</h2>
            <div className="tv-track">
              {continueWatchingList.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className="tv-card wide"
                  data-tv-autofocus
                  data-tv-managed-scroll
                  aria-label={`Resume ${titleOf(item)}, episode ${item.episode || 1}`}
                  onFocus={(e) => handleFocus(item, e)}
                  onClick={() => onResumeWatching(item, item.episode, item.currentTime)}
                >
                  <img src={item.bannerImage || item.coverImage?.large || '/placeholder.svg'} alt="" loading="lazy" />
                  <span className="tv-card-caption">E{item.episode || 1} • {titleOf(item)}</span>
                  <span className="tv-card-progress"><span style={{ width: `${item.progressPercent || 0}%` }} /></span>
                </button>
              ))}
            </div>
          </section>
        )}

        {SOURCES.map(source => (
          <section key={source.id} className="tv-row">
            <h2 className="tv-row-title">{source.title}</h2>
            <div className="tv-track">
              {rows[source.id] ? rows[source.id].map((anime, i) => (
                <button
                  key={anime.id}
                  type="button"
                  className="tv-card"
                  data-tv-managed-scroll
                  aria-label={titleOf(anime)}
                  onFocus={(e) => handleFocus(anime, e)}
                  onClick={() => onViewDetails(anime)}
                >
                  <img src={anime.coverImage?.large || anime.coverImage?.extraLarge || '/placeholder.svg'} alt="" loading="lazy" decoding="async" />
                  {source.ranked && i < 10 && <span className="tv-card-rank">{i + 1}</span>}
                </button>
              )) : Array.from({ length: 7 }, (_, i) => <div key={i} className="tv-card skeleton" />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
