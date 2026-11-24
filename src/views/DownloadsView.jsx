import React from 'react';
import { ListPlus, ListVideo, Play, Trash2, Film, ArrowRight } from 'lucide-react';

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
    <div className="section-wrapper" style={{ marginTop: '1.5rem' }}>
      <div className="section-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="section-title-group">
            <div className="section-indicator" />
            <h1 className="section-title">Saved Episodes</h1>
          </div>
          <div className="section-subtitle">
            <ListVideo size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            {downloads.length} {downloads.length === 1 ? 'episode' : 'episodes'} saved for quick access
          </div>
        </div>

        {downloads.length > 0 && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (window.confirm(`Remove all ${downloads.length} saved ${downloads.length === 1 ? 'episode' : 'episodes'}?`)) {
                onClearAllDownloads();
              }
            }}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', color: '#fb7185' }}
            title="Remove all saved episodes"
          >
            <Trash2 size={14} />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {downloads.length === 0 ? (
        <div className="empty-state-card">
          <Film size={48} color="var(--text-dim)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.4rem' }}>
            No Saved Episodes Yet
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto 1.5rem', lineHeight: '1.6' }}>
            Tap <ListPlus size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Save Ep</strong> in the video player or an anime's details to keep a shortcut to that exact episode and audio track.
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
                      <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />
                    </button>
                  </div>
                  <div className="download-track-badge">
                    {TRACK_LABELS[item.track] || 'SUB'}
                  </div>
                </div>

                <div className="download-card-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
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
                      style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}
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
