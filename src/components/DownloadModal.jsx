import React, { useState } from 'react';
import { ListPlus, X, Check, Copy, Info, Trash2 } from 'lucide-react';
import { saveDownload, removeDownload, isEpisodeDownloaded } from '../services/storage';
import { resolveEpisodeCount, getPublicBaseUrl } from '../services/api';

// Saves a shortcut to one episode (with the chosen audio/sub track). The video itself is
// streamed from the player each time; nothing is stored on the device.
export default function DownloadModal({
  isOpen,
  onClose,
  anime,
  currentEpisode = 1,
  currentTrack = 'sub',
  server = 'zoko',
  onDownloadSaved
}) {
  const [track, setTrack] = useState(currentTrack);
  const [copied, setCopied] = useState(false);
  // Bumped after save/remove so "saved" is re-read from storage for the current episode
  const [, setVersion] = useState(0);

  if (!isOpen || !anime) return null;

  const saved = isEpisodeDownloaded(anime.id, currentEpisode);
  const title = anime.title?.english || anime.title?.romaji || 'Anime';
  const targetSource = anime.idMal ? 'mal' : 'ani';
  const targetId = anime.idMal || anime.id;

  const streamUrl = server === 'kiwi'
    ? `https://zokoanime.video/kiwi/${targetSource}/${targetId}/${currentEpisode}/${track}`
    : `https://zokoanime.video/stream/${targetSource}/${targetId}/${currentEpisode}/${track}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${getPublicBaseUrl()}/?watch=${anime.id}&ep=${currentEpisode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleToggleSaved = () => {
    if (saved) {
      removeDownload(anime.id, currentEpisode);
    } else {
      saveDownload({
        id: `${anime.id}-${currentEpisode}`,
        animeId: anime.id,
        idMal: anime.idMal,
        title: anime.title,
        coverImage: anime.coverImage,
        bannerImage: anime.bannerImage,
        episode: currentEpisode,
        totalEpisodes: resolveEpisodeCount(anime),
        track,
        server,
        streamUrl
      });
      onDownloadSaved?.();
    }
    setVersion(v => v + 1);
  };

  return (
    <div
      className="search-modal-backdrop"
      onClick={(e) => {
        // This modal can be rendered inside another modal's backdrop; don't let the click close the parent too
        e.stopPropagation();
        onClose();
      }}
      style={{ zIndex: 250 }}
    >
      <div
        className="search-modal-box download-modal-box"
        role="dialog"
        aria-modal="true"
        aria-label="Save episode"
        onClick={e => e.stopPropagation()}
      >
        <div className="download-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="download-modal-icon-badge">
              <ListPlus size={18} />
            </div>
            <div>
              <h3 className="download-modal-title">Save Episode</h3>
              <p className="download-modal-subtitle">
                {title} • Episode {currentEpisode}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close save episode dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="download-modal-body">
          <div className="download-option-group">
            <label className="download-option-label">Audio & Subtitles Track</label>
            <div className="segmented-control" style={{ width: '100%' }}>
              {[
                ['sub', 'English Sub'],
                ['hsub', 'Hardcoded Sub'],
                ['dub', 'English Dub']
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`segmented-btn ${track === value ? 'active' : ''}`}
                  onClick={() => setTrack(value)}
                  style={{ flex: 1, padding: '0.45rem' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="download-actions-stack">
            <button
              type="button"
              className={saved ? 'btn-secondary' : 'btn-primary'}
              onClick={handleToggleSaved}
              style={{ justifyContent: 'center', padding: '0.85rem' }}
            >
              {saved ? (
                <>
                  <Trash2 size={18} />
                  <span>Remove from Saved Episodes</span>
                </>
              ) : (
                <>
                  <ListPlus size={18} />
                  <span>Save Episode {currentEpisode}</span>
                </>
              )}
            </button>

            {saved && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--accent-color)' }}>
                <Check size={14} />
                <span>Saved — find it under Episodes</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCopyLink}
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '0.5rem' }}
              >
                {copied ? <Check size={14} color="var(--accent-color)" /> : <Copy size={14} />}
                <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
              </button>

            </div>
          </div>

          <div className="download-modal-note">
            <Info size={15} color="var(--accent-color)" style={{ flexShrink: 0 }} />
            <span>
              This saves a shortcut so you can jump straight back to this episode. Playback still streams, so an internet connection is required.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
