import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Sparkles, 
  X, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  ShieldCheck, 
  Settings,
  HardDrive
} from 'lucide-react';
import { 
  startDownloadAndInstall, 
  cancelUpdate, 
  dismissUpdateForNow, 
  openInstallSettings, 
  checkInstallPermission,
  installDownloadedApk 
} from '../services/otaService';

export default function OtaUpdateModal({ updateInfo, onClose, onUpdateComplete }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'permission_check' | 'downloading' | 'completed' | 'error'
  const [progressData, setProgressData] = useState({
    progress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    formattedDownloaded: '0 MB',
    formattedTotal: updateInfo?.apkSize || '15 MB',
    speed: '0 KB/s',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [hasPermission, setHasPermission] = useState(true);

  useEffect(() => {
    // Check initial install permission if on native Android
    if (updateInfo?.isNative) {
      checkInstallPermission().then(granted => {
        setHasPermission(granted);
      });
    }
  }, [updateInfo]);

  if (!updateInfo) return null;

  const handleStartUpdate = async () => {
    // If on native Android and install permission not granted, prompt user first
    if (updateInfo.isNative) {
      const granted = await checkInstallPermission();
      if (!granted) {
        setHasPermission(false);
        setStatus('permission_prompt');
        return;
      }
    }

    setStatus('downloading');
    setErrorMessage('');

    try {
      await startDownloadAndInstall(updateInfo.downloadUrl, (event) => {
        if (event.status === 'downloading') {
          setProgressData(prev => ({
            ...prev,
            progress: event.progress >= 0 ? event.progress : prev.progress,
            downloadedBytes: event.downloadedBytes,
            totalBytes: event.totalBytes,
            formattedDownloaded: event.formattedDownloaded,
            formattedTotal: event.formattedTotal || updateInfo.apkSize,
            speed: event.speed,
          }));
        } else if (event.status === 'completed') {
          setStatus('completed');
          onUpdateComplete?.();
        } else if (event.status === 'cancelled') {
          setStatus('idle');
        } else if (event.status === 'error') {
          setStatus('error');
          setErrorMessage(event.error || 'Failed to download update package');
        }
      }, updateInfo.sha256);
    } catch (err) {
      if (status !== 'idle') {
        setStatus('error');
        setErrorMessage(err.message || 'An error occurred during update download');
      }
    }
  };

  const handleCancelDownload = async () => {
    await cancelUpdate();
    setStatus('idle');
  };

  const handleOpenSettings = async () => {
    await openInstallSettings();
    // After returning from settings, user can tap "Proceed"
  };

  const handleManualInstall = async () => {
    try {
      await installDownloadedApk();
    } catch (err) {
      setErrorMessage(err.message || 'Could not launch package installer');
    }
  };

  const handleDismiss = () => {
    if (updateInfo?.latestVersion) {
      dismissUpdateForNow(updateInfo.latestVersion);
    }
    onClose();
  };

  // GitHub release notes are markdown (headings, bold, links, emoji). Show them as clean text and
  // leave out download-link lines: the button below already does that.
  const changelogItems = (() => {
    const items = String(updateInfo.changelog || '')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !/https?:\/\//i.test(l))
      .map(l => {
        const kind = /^#/.test(l) ? 'heading' : /^[-*]\s/.test(l) ? 'bullet' : 'text';
        const text = l
          .replace(/^[#>\-*\s]+/, '')
          .replace(/\*\*(.+?)\*\*/g, '$1')
          .replace(/\[(.+?)\]\(.*?\)/g, '$1')
          .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
          .replace(/\uFE0F/g, '')
          .trim();
        return { kind, text };
      })
      .filter(i => i.text && !(i.kind === 'heading' && /direct downloads?|^otakuplay v?\d/i.test(i.text)));
    return items;
  })();

  return (
    <div className="ota-modal-backdrop" onClick={status === 'downloading' ? undefined : handleDismiss}>
      <div 
        className="ota-modal-card" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ota-modal-title"
      >
        {/* Decorative Neon Top Accent */}
        <div className="ota-modal-header-accent" />

        {/* Pinned Modal Header */}
        <div className="ota-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <div className="ota-modal-icon-badge">
              <Sparkles size={20} color="var(--accent-color)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 id="ota-modal-title" className="ota-modal-title">
                Update available
              </h2>
              <div className="ota-modal-subtitle">OtakuPlay v{updateInfo.latestVersion} is ready</div>
            </div>
          </div>

          {status !== 'downloading' && (
            <button 
              className="icon-btn" 
              onClick={handleDismiss}
              aria-label="Close update dialog"
              style={{ padding: '0.4rem', flexShrink: 0 }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Scrollable Containerized Content Body */}
        <div className="ota-modal-body-scroll">
          {/* Version Difference Banner */}
          <div className="ota-version-strip">
            <div className="ota-ver-pill current">
              <span className="label">Installed</span>
              <span className="val">v{updateInfo.currentVersion}</span>
            </div>

            <div className="ota-ver-arrow">
              <ArrowRight size={16} />
            </div>

            <div className="ota-ver-pill latest">
              <span className="label">New Version</span>
              <span className="val">v{updateInfo.latestVersion}</span>
            </div>

            <div className="ota-size-badge" title="Download package size">
              <HardDrive size={13} />
              <span>{updateInfo.apkSize}</span>
            </div>
          </div>

          {/* Content Body based on Status */}
          <div className="ota-modal-content">
          {status === 'permission_prompt' && (
            <div className="ota-permission-box">
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <ShieldCheck size={24} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.92rem', color: '#fbbf24' }}>
                    Android Install Permission Needed
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    To install updates directly over-the-air, Android requires you to enable 
                    <strong> "Allow from this source"</strong> for OtakuPlay in your device settings.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={handleOpenSettings}
                  style={{ flex: 1, padding: '0.65rem 1rem', fontSize: '0.85rem' }}
                >
                  <Settings size={15} />
                  <span>Open Android Settings</span>
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => {
                    setHasPermission(true);
                    handleStartUpdate();
                  }}
                  style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}
                >
                  <span>Done / Proceed</span>
                </button>
              </div>
            </div>
          )}

          {status === 'downloading' && (
            <div className="ota-download-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Downloading OtakuPlay Update...
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {progressData.formattedDownloaded} / {progressData.formattedTotal}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="ota-progress-pct">
                    {progressData.progress >= 0 ? `${progressData.progress}%` : 'Downloading'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-color)', fontFamily: 'var(--font-mono)' }}>
                    {progressData.speed}
                  </div>
                </div>
              </div>

              {/* Glowing Progress Bar */}
              <div className="ota-progress-track">
                <div 
                  className="ota-progress-fill" 
                  style={{ width: `${Math.max(5, progressData.progress)}%` }} 
                />
              </div>

              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.85rem' }}>
                Please keep the app open while the update package downloads.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={handleCancelDownload}
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem' }}
                >
                  <X size={14} />
                  <span>Cancel Download</span>
                </button>
              </div>
            </div>
          )}

          {status === 'completed' && (
            <div className="ota-success-box">
              <CheckCircle2 size={36} color="var(--accent-color)" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.35rem 0' }}>
                Download Complete!
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 auto 1.25rem', maxWidth: '380px' }}>
                The package installer should open automatically. If it didn't prompt, tap <strong>Install Now</strong> below.
              </p>
              <div style={{ fontSize: '0.74rem', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.25)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', margin: '0 auto 1.1rem', maxWidth: '380px', textAlign: 'left', lineHeight: 1.4 }}>
                ⚠️ <strong>Note:</strong> If Android says "package conflicts with an existing package", please uninstall your older version first. All future updates will then install smoothly!
              </div>
              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center' }}>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={handleManualInstall}
                  style={{ padding: '0.65rem 1.5rem', fontSize: '0.85rem' }}
                >
                  <Download size={16} />
                  <span>Install Now</span>
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={onClose}
                  style={{ padding: '0.65rem 1.2rem', fontSize: '0.85rem' }}
                >
                  <span>Close</span>
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="ota-error-box">
              <AlertCircle size={28} color="#fb7185" style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fb7185', marginBottom: '0.35rem' }}>
                Update Download Failed
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
                {errorMessage}
              </p>
              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={handleStartUpdate}
                  style={{ padding: '0.55rem 1.25rem', fontSize: '0.82rem' }}
                >
                  <RefreshCw size={14} />
                  <span>Try Again</span>
                </button>
                <a 
                  href={updateInfo.releaseUrl || updateInfo.downloadUrl}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-secondary"
                  style={{ padding: '0.55rem 1.2rem', fontSize: '0.82rem' }}
                >
                  <ExternalLink size={14} />
                  <span>Download Manually</span>
                </a>
              </div>
            </div>
          )}

          {status === 'idle' && (
            <>
              <div className="ota-changelog-container">
                <div className="ota-changelog-header">What's new</div>
                <div className="ota-changelog-content">
                  {changelogItems.length === 0 ? (
                    <p className="ota-cl-text">Performance improvements and bug fixes.</p>
                  ) : changelogItems.map((item, idx) => (
                    item.kind === 'bullet' ? (
                      <div key={idx} className="ota-cl-bullet"><span aria-hidden="true">•</span><span>{item.text}</span></div>
                    ) : item.kind === 'heading' ? (
                      <div key={idx} className="ota-cl-heading">{item.text}</div>
                    ) : (
                      <p key={idx} className="ota-cl-text">{item.text}</p>
                    )
                  ))}
                </div>
              </div>

              <div className="ota-modal-actions">
                <button
                  type="button"
                  className="btn-primary ota-action-btn"
                  onClick={handleStartUpdate}
                >
                  <Download size={16} />
                  <span>{updateInfo.isNative ? 'Update now' : 'Download APK'}</span>
                </button>

                <button
                  type="button"
                  className="ota-later-btn"
                  onClick={handleDismiss}
                >
                  Remind me later
                </button>
              </div>
            </>
          )}
        </div>
        </div>

      </div>
    </div>
  );
}
