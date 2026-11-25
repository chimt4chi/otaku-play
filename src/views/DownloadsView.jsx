import React from 'react';
import { ListPlus, ListVideo, Play, Trash2, Film, ArrowRight } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';

const TRACK_LABELS = { sub: 'SUB', hsub: 'HSUB', dub: 'DUB' };

export default function DownloadsView({
  downloads = [],
  onWatchAnime,
  onRemoveDownload,
  onClearAllDownloads,
  onBrowseAnime
}) {
  // Saved items store the AniList id as `animeId`; the player expects it as `id`
  const play = (item) => onWatchAnime({ ...item, id: item.animeId }, item.episode);

  return (
    <div className="section-wrapper page-section">
      <SectionHeader
        title="Saved Episodes"
        as="h1"
        icon={ListVideo}
        subtitle={`${downloads.length} ${downloads.length === 1 ? 'episode' : 'episodes'} saved for quick access`}
        action={downloads.length > 0 ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (window.confirm(`Remove all ${downloads.length} saved ${downloads.length === 1 ? 'episode' : 'episodes'}?`)) {
                onClearAllDownloads();
              }
            }}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', color: '#fb7185' }}
            title="Remove all saved episodes"
          >
            <Trash2 size={14} />
            <span>Clear All</span>
          </button>
        ) : null}
      />

      {downloads.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <Film size={30} />
          </div>
          <h3 className="empty-state-title">No Saved Episodes Yet</h3>
          <p className="empty-state-text">
            Tap <ListPlus size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Save Ep</strong> in the video player or anime details to keep a direct shortcut to that exact episode and audio track.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={onBrowseAnime}
          >
            <span>Explore Catalog</span>
            <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div className="downloads-grid">
          {downloads.map(item => {
            const title = item.title?.english || item.title?.romaji || 'Anime';
            const thumb = item.coverImage?.large || item.bannerImage;

            return (
              <div key={item.id} className="download-card">
                <div className="download-card-thumb-wrap">
                  <img src={thumb} alt="" className="download-card-thumb" loading="lazy" decoding="async" />
                  <div className="card-quick-play">
                    <button
                      type="button"
                      className="card-quick-play-btn"
                      onClick={() => play(item)}
                      title={`Play Episode ${item.episode}`}
                    >
                      <Play size={19} fill="currentColor" style={{ marginLeft: '2px' }} />
                    </button>
                  </div>
                  <div className="download-track-badge">
                    {TRACK_LABELS[item.track] || 'SUB'}
                  </div>
                </div>

                <div className="download-card-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <h4 className="download-card-title" title={title}>
                        {title}
                      </h4>
                      <div className="download-card-meta">
                        Episode {item.episode}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveDownload(item.animeId, item.episode)}
                      title="Remove from saved episodes"
                      aria-label={`Remove ${title} episode ${item.episode} from saved episodes`}
                      className="icon-btn download-remove-btn"
                    >
                      <Trash2 size={14} color="#fb7185" />
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '0.65rem' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => play(item)}
                      style={{ padding: '0.45rem 0.95rem', fontSize: '0.78rem' }}
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Watch</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
