import React, { useState, useEffect, useRef } from 'react';
import { Play, X, Clock, Tv } from 'lucide-react';
import { getAnimeDetails } from '../services/api';
import { updateContinueWatching } from '../services/storage';
import SectionHeader from './SectionHeader';
import CarouselRow from './CarouselRow';

export default function ContinueWatchingRow({
  items = [],
  onResume,
  onRemove
}) {
  const [resolvedCovers, setResolvedCovers] = useState({});
  const [failedImages, setFailedImages] = useState({});
  const fetchingRef = useRef(new Set());

  const getCoverUrl = (item) => {
    const c = item.coverImage || resolvedCovers[item.id];
    if (c) {
      if (typeof c === 'string' && c.trim()) return c;
      if (c.extraLarge) return c.extraLarge;
      if (c.large) return c.large;
      if (c.medium) return c.medium;
    }
    if (typeof item.bannerImage === 'string' && item.bannerImage.trim()) {
      return item.bannerImage;
    }
    return null;
  };

  // Backfill official cover from AniList for any continue-watching item missing it
  useEffect(() => {
    if (!items || items.length === 0) return;

    items.forEach(item => {
      const hasCover = item.coverImage && (
        (typeof item.coverImage === 'string' && item.coverImage.trim()) ||
        item.coverImage.extraLarge ||
        item.coverImage.large ||
        item.coverImage.medium
      );

      if (!hasCover && item.id && !fetchingRef.current.has(item.id)) {
        fetchingRef.current.add(item.id);
        getAnimeDetails(item.id).then(details => {
          if (details?.coverImage) {
            setResolvedCovers(prev => ({ ...prev, [item.id]: details.coverImage }));
            updateContinueWatching({
              ...item,
              coverImage: details.coverImage,
              bannerImage: details.bannerImage || item.bannerImage
            });
          }
        }).catch(() => {});
      }
    });
  }, [items]);

  if (!items || items.length === 0) return null;

  return (
    <section className="section-wrapper" aria-label="Continue Watching">
      <SectionHeader
        title="Continue Watching"
        icon={Clock}
        subtitle="Pick up right where you left off"
      />

      <CarouselRow label="Continue watching episodes">
        {items.map((item) => {
          const title = item.title?.english || item.title?.romaji || 'Anime';
          const thumb = getCoverUrl(item);
          const hasFailed = failedImages[item.id];
          const progress = Math.max(5, Math.min(100, item.progressPercent || 0));

          return (
            <div
              key={`${item.id}-${item.episode}`}
              className="continue-card"
              role="button"
              tabIndex={0}
              aria-label={`Resume ${title}, episode ${item.episode}`}
              onClick={() => onResume(item, item.episode, item.currentTime)}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onResume(item, item.episode, item.currentTime);
                }
              }}
            >
              <div className="continue-thumb-wrap">
                {thumb && !hasFailed ? (
                  <img
                    src={thumb}
                    alt={title}
                    className="continue-thumb"
                    loading="eager"
                    decoding="async"
                    draggable={false}
                    onError={() => {
                      setFailedImages(prev => ({ ...prev, [item.id]: true }));
                      if (item.id && !fetchingRef.current.has(item.id)) {
                        fetchingRef.current.add(item.id);
                        getAnimeDetails(item.id).then(details => {
                          if (details?.coverImage) {
                            setResolvedCovers(prev => ({ ...prev, [item.id]: details.coverImage }));
                            setFailedImages(prev => ({ ...prev, [item.id]: false }));
                          }
                        }).catch(() => {});
                      }
                    }}
                  />
                ) : (
                  <div className="continue-thumb-fallback">
                    <Tv size={20} color="var(--accent-color)" />
                  </div>
                )}
                <div className="continue-thumb-play" aria-hidden="true">
                  <Play size={14} fill="currentColor" style={{ marginLeft: '1px' }} />
                </div>
              </div>

              <div className="continue-details">
                <div className="continue-head-row">
                  <span className="continue-ep-pill">Ep {item.episode}</span>
                  <button
                    type="button"
                    className="continue-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item.id);
                    }}
                    title="Remove from history"
                    aria-label={`Remove ${title} from history`}
                  >
                    <X size={14} />
                  </button>
                </div>

                <h4 className="continue-title" title={title}>{title}</h4>

                <div className="continue-progress-row">
                  <div className="continue-progress-bar-wrap">
                    <div
                      className="continue-progress-bar-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="continue-pct">{progress}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </CarouselRow>
    </section>
  );
}
