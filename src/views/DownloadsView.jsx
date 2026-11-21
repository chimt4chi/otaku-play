import React from 'react';
import { Download, Play, Trash2, HardDrive, Film, ArrowRight, ShieldCheck, Sparkles, Smartphone, ExternalLink, RefreshCw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const isNativeApp = Capacitor.isNativePlatform();

export default function DownloadsView({
  downloads = [],
  onWatchAnime,
  onRemoveDownload,
  onClearAllDownloads,
  onBrowseAnime,
  updateInfo,
  onCheckUpdates,
  onOpenUpdateModal,
  checkingUpdate = false,
}) {
  const totalMb = downloads.reduce((acc, curr) => acc + (curr.sizeMb || 140), 0);
  const formattedStorage = totalMb > 1024
    ? `${(totalMb / 1024).toFixed(2)} GB`
    : `${totalMb} MB`;

  return (
    <div className="section-wrapper" style={{ marginTop: '1.5rem' }}>
      {/* View Header */}
      <div className="section-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="section-title-group">
            <div className="section-indicator" />
            <h1 className="section-title">Offline Downloads</h1>
          </div>
          <div className="section-subtitle">
            <HardDrive size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            {downloads.length} {downloads.length === 1 ? 'Episode' : 'Episodes'} available offline ({formattedStorage})
          </div>
        </div>

        {downloads.length > 0 && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (window.confirm(`Remove all ${downloads.length} offline ${downloads.length === 1 ? 'episode' : 'episodes'}?`)) {
                onClearAllDownloads();
              }
            }}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', color: '#fb7185' }}
            title="Delete all downloaded episodes"
          >
            <Trash2 size={14} />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Android OTA Updates Banner (Native) or APK Download Card (Web) */}
      {isNativeApp ? (
        <div 
          className="apk-feature-banner" 
          style={{ 
            borderColor: updateInfo?.hasUpdate ? 'var(--accent-color)' : undefined,
            boxShadow: updateInfo?.hasUpdate ? '0 0 20px var(--accent-glow)' : undefined
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div 
              className="apk-banner-icon"
              style={{
                background: updateInfo?.hasUpdate ? 'var(--accent-color)' : undefined,
                color: updateInfo?.hasUpdate ? '#07080d' : undefined
              }}
            >
              {updateInfo?.hasUpdate ? <Sparkles size={24} /> : <Smartphone size={24} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
                  OtakuPlay Android (v{updateInfo?.currentVersion || '1.0.0'})
                </h3>
                {updateInfo?.hasUpdate && (
                  <span className="badge badge-brand" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                    v{updateInfo.latestVersion} Available
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem', margin: 0 }}>
                {updateInfo?.hasUpdate
                  ? `An over-the-air update (${updateInfo.latestVersion}) is ready to download & install directly.`
                  : 'Over-The-Air updater is active. Your app is running the official release.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {updateInfo?.hasUpdate ? (
              <button
                type="button"
                className="btn-primary"
                onClick={onOpenUpdateModal}
                style={{ padding: '0.65rem 1.2rem', fontSize: '0.82rem', flexShrink: 0 }}
              >
                <Sparkles size={16} />
                <span>Update Now (v{updateInfo.latestVersion})</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={onCheckUpdates}
                disabled={checkingUpdate}
                style={{ padding: '0.65rem 1.2rem', fontSize: '0.82rem', flexShrink: 0 }}
              >
                <RefreshCw 
                  size={14} 
                  style={{ animation: checkingUpdate ? 'spin 1s linear infinite' : 'none' }} 
                />
                <span>{checkingUpdate ? 'Checking...' : 'Check for Updates'}</span>
              </button>
            )}

            <a
              href="https://github.com/chimt4chi/otaku-play/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', flexShrink: 0 }}
              title="View all versions and release notes on GitHub"
            >
              <ExternalLink size={14} />
              <span>All Releases</span>
            </a>
          </div>
        </div>
      ) : (
        <div className="apk-feature-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div className="apk-banner-icon">
              <Smartphone size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
                  OtakuPlay Dedicated Android App
                </h3>
                {updateInfo?.hasUpdate && (
                  <span className="badge badge-brand" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                    v{updateInfo.latestVersion} Available
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem', margin: 0 }}>
                Install the dedicated APK for notch-free playback, offline cache & native hardware back controls.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {updateInfo?.hasUpdate ? (
              <button
                type="button"
                className="btn-primary"
                onClick={onOpenUpdateModal}
                style={{ padding: '0.65rem 1.2rem', fontSize: '0.82rem', flexShrink: 0 }}
              >
                <Sparkles size={16} />
                <span>Get v{updateInfo.latestVersion} APK</span>
              </button>
            ) : (
              <a
                href="/assets/OtakuPlay.apk"
                download="OtakuPlay.apk"
                className="btn-primary"
                style={{ padding: '0.65rem 1.2rem', fontSize: '0.82rem', flexShrink: 0 }}
              >
                <Download size={16} />
                <span>Download APK (v1.0.0)</span>
              </a>
            )}

            <button
              type="button"
              className="btn-secondary"
              onClick={onCheckUpdates}
              disabled={checkingUpdate}
              style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', flexShrink: 0 }}
            >
              <RefreshCw 
                size={14} 
                style={{ animation: checkingUpdate ? 'spin 1s linear infinite' : 'none' }} 
              />
              <span>{checkingUpdate ? 'Checking...' : 'Check Updates'}</span>
            </button>

            <a
              href="https://github.com/chimt4chi/otaku-play/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', flexShrink: 0 }}
              title="View all versions and release notes on GitHub"
            >
              <ExternalLink size={14} />
              <span>All Releases</span>
            </a>
          </div>
        </div>
      )}

      {/* Downloads List */}
      {downloads.length === 0 ? (
        <div className="empty-state-card">
          <Film size={48} color="var(--text-dim)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.4rem' }}>
            No Offline Episodes Yet
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto 1.5rem', lineHeight: '1.6' }}>
            Tap the <Download size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Download</strong> button on any episode in the video player or anime details card to save episodes for instant offline playback without buffering.
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
                      onClick={() => onWatchAnime(item, item.episode)}
                      title={`Play Episode ${item.episode}`}
                    >
                      <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />
                    </button>
                  </div>
                  <div className="download-track-badge">
                    {item.track?.toUpperCase() || 'SUB'}
                  </div>
                </div>

                <div className="download-card-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <h4 className="download-card-title" title={title}>
                        {title}
                      </h4>
                      <div className="download-card-meta">
                        Episode {item.episode} • {item.quality || '1080p'} • ~{item.sizeMb || 140} MB
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveDownload(item.animeId, item.episode)}
                      title="Remove from offline storage"
                      aria-label={`Remove ${title} episode ${item.episode} from offline storage`}
                      className="icon-btn download-remove-btn"
                    >
                      <Trash2 size={14} color="#fb7185" />
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.65rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-color)', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                      <ShieldCheck size={12} /> Ready Offline
                    </span>

                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => onWatchAnime(item, item.episode)}
                      style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Play Offline</span>
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

