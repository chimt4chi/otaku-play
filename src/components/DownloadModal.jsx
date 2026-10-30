import React, { useState } from 'react';
import { Download, X, Check, Copy, HardDrive, Sparkles, Film, ExternalLink, ShieldCheck } from 'lucide-react';
import { saveDownload, isEpisodeDownloaded } from '../services/storage';

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
  const [quality, setQuality] = useState('1080p');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [savedOffline, setSavedOffline] = useState(
    isEpisodeDownloaded(anime?.id, currentEpisode)
  );

  if (!isOpen || !anime) return null;

  const title = anime.title?.english || anime.title?.romaji || 'Anime';
  const targetSource = anime.idMal ? 'mal' : 'ani';
  const targetId = anime.idMal || anime.id;

  // Stream / download link
  const streamUrl = server === 'kiwi'
    ? `https://zokoanime.video/kiwi/${targetSource}/${targetId}/${currentEpisode}/${track}`
    : `https://zokoanime.video/stream/${targetSource}/${targetId}/${currentEpisode}/${track}`;

  const estimatedSizes = {
    '1080p': '185 MB',
    '720p': '115 MB',
    '480p': '65 MB'
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(streamUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSaveToOffline = () => {
    setDownloading(true);
    setTimeout(() => {
      const downloadItem = {
        id: `${anime.id}-${currentEpisode}`,
        animeId: anime.id,
        idMal: anime.idMal,
        title: anime.title,
        coverImage: anime.coverImage,
        bannerImage: anime.bannerImage,
        episode: currentEpisode,
        totalEpisodes: anime.episodes || 24,
        track,
        server,
        quality,
        streamUrl,
        sizeMb: parseInt(estimatedSizes[quality], 10) || 140
      };

      const updated = saveDownload(downloadItem);
      onDownloadSaved?.(updated);
      setDownloading(false);
      setSavedOffline(true);
    }, 800);
  };

  const handleDirectDownload = () => {
    // Open stream in new tab or trigger browser download
    const link = document.createElement('a');
    link.href = streamUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_EP${currentEpisode}_${track.toUpperCase()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Also register in local downloads
    handleSaveToOffline();
  };

  return (
    <div className="search-modal-backdrop" onClick={onClose} style={{ zIndex: 250 }}>
      <div 
        className="search-modal-box download-modal-box" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="download-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="download-modal-icon-badge">
              <Download size={18} />
            </div>
            <div>
              <h3 className="download-modal-title">Offline Episode Download</h3>
              <p className="download-modal-subtitle">
                {title} • Episode {currentEpisode}
              </p>
            </div>
          </div>

          <button 
            type="button" 
            className="icon-btn" 
            onClick={onClose}
            aria-label="Close download modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="download-modal-body">
          {/* Audio Track Selector */}
          <div className="download-option-group">
            <label className="download-option-label">Audio & Subtitles Track</label>
            <div className="segmented-control" style={{ width: '100%' }}>
              <button
                type="button"
                className={`segmented-btn ${track === 'sub' ? 'active' : ''}`}
                onClick={() => setTrack('sub')}
                style={{ flex: 1, padding: '0.45rem' }}
              >
                English Sub
              </button>
              <button
                type="button"
                className={`segmented-btn ${track === 'hsub' ? 'active' : ''}`}
                onClick={() => setTrack('hsub')}
                style={{ flex: 1, padding: '0.45rem' }}
              >
                Hardcoded Sub
              </button>
              <button
                type="button"
                className={`segmented-btn ${track === 'dub' ? 'active' : ''}`}
                onClick={() => setTrack('dub')}
                style={{ flex: 1, padding: '0.45rem' }}
              >
                English Dub
              </button>
            </div>
          </div>

          {/* Quality Selector */}
          <div className="download-option-group">
            <label className="download-option-label">Video Quality & Size</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {['1080p', '720p', '480p'].map(q => (
                <button
                  key={q}
                  type="button"
                  className={`download-quality-card ${quality === q ? 'active' : ''}`}
                  onClick={() => setQuality(q)}
                >
                  <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{q}</span>
                  <span style={{ fontSize: '0.72rem', color: quality === q ? 'var(--text-inverse)' : 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    ~{estimatedSizes[q]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Download & Offline Features */}
          <div className="download-actions-stack">
            <button
              type="button"
              className="btn-primary"
              onClick={handleDirectDownload}
              style={{ justifyContent: 'center', padding: '0.85rem' }}
            >
              <Download size={18} />
              <span>Download Episode {currentEpisode} ({quality})</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleSaveToOffline}
              disabled={downloading}
              style={{ justifyContent: 'center', padding: '0.75rem', position: 'relative' }}
            >
              {savedOffline ? (
                <>
                  <Check size={18} color="var(--accent-color)" />
                  <span style={{ color: 'var(--accent-color)' }}>Saved to Offline Library</span>
                </>
              ) : (
                <>
                  <HardDrive size={18} />
                  <span>{downloading ? 'Adding to Offline Library...' : 'Save to Offline Library'}</span>
                </>
              )}
            </button>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCopyLink}
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '0.5rem' }}
              >
                {copied ? <Check size={14} color="var(--accent-color)" /> : <Copy size={14} />}
                <span>{copied ? 'Stream Link Copied!' : 'Copy Stream Link'}</span>
              </button>

              <a
                href={streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '0.5rem' }}
              >
                <ExternalLink size={14} />
                <span>Open in Player</span>
              </a>
            </div>
          </div>

          {/* Info note */}
          <div className="download-modal-note">
            <ShieldCheck size={15} color="var(--accent-color)" style={{ flexShrink: 0 }} />
            <span>
              Episodes saved to your Offline Library can be played anywhere under the Downloads tab without buffering.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

