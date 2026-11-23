import { Capacitor, registerPlugin } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import packageJson from '../../package.json';

// Register the custom native OTA Android plugin (safe fallback if not native)
const OtaUpdater = registerPlugin('OtaUpdater');

export const CURRENT_APP_VERSION = packageJson.version || '1.2.5';
export const GITHUB_REPO = 'chimt4chi/otaku-play';
export const FALLBACK_VERSION = CURRENT_APP_VERSION;

const STORAGE_KEYS = {
  LAST_CHECK: 'otaku_ota_last_check',
  DISMISSED_VERSION: 'otaku_ota_dismissed_version',
  DISMISSED_TIME: 'otaku_ota_dismissed_time',
};

/**
 * Compare two semver-like strings (e.g., "1.0.1" vs "1.0.0", "v1.2.0" vs "1.1.9")
 * Returns:
 *   1 if v1 > v2 (v1 is newer)
 *  -1 if v1 < v2 (v1 is older)
 *   0 if v1 == v2
 */
export function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  const clean1 = String(v1).replace(/^v/i, '').trim();
  const clean2 = String(v2).replace(/^v/i, '').trim();

  const parts1 = clean1.split('.').map(p => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map(p => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Get current running app version and platform details.
 */
export async function getCurrentAppInfo() {
  const isNative = Capacitor.isNativePlatform();
  let versionName = CURRENT_APP_VERSION;
  let versionCode = 8;
  let packageName = 'com.otakuplay.app';
  let canInstallUnknownApps = true;

  if (isNative) {
    try {
      const info = await CapApp.getInfo();
      if (info?.version) {
        versionName = info.version;
      }
      if (info?.build) {
        const parsed = parseInt(info.build, 10);
        if (!isNaN(parsed) && parsed > 0) {
          versionCode = parsed;
        }
      }
      if (info?.id) {
        packageName = info.id;
      }
    } catch (err) {
      console.warn('Could not read native app version:', err);
    }
  }

  return {
    isNative,
    versionName,
    versionCode,
    packageName,
    canInstallUnknownApps,
  };
}

/**
 * Format bytes into human-readable MB / KB string
 */
export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`;
  }
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

/**
 * Format download speed into human-readable string
 */
export function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
  const mbps = bytesPerSec / (1024 * 1024);
  if (mbps >= 1) {
    return `${mbps.toFixed(1)} MB/s`;
  }
  const kbps = bytesPerSec / 1024;
  return `${kbps.toFixed(0)} KB/s`;
}

/**
 * Check GitHub Releases for newer version of OtakuPlay
 * @param {boolean} force - If true, ignores recent check cache
 */
export async function checkForAppUpdate(force = false) {
  const now = Date.now();
  const lastCheck = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_CHECK) || '0', 10);
  const minInterval = 1000 * 60 * 30; // 30 minutes cache for auto-checks

  if (!force && now - lastCheck < minInterval) {
    return { skipped: true, reason: 'recently_checked' };
  }

  try {
    const currentInfo = await getCurrentAppInfo();
    const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

    const res = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return { hasUpdate: false, message: 'No releases found on GitHub' };
      }
      throw new Error(`GitHub API error HTTP ${res.status}`);
    }

    const release = await res.json();
    localStorage.setItem(STORAGE_KEYS.LAST_CHECK, String(now));

    const latestTag = release.tag_name || '';
    const latestVersion = latestTag.replace(/^v/i, '').trim();
    const isNewer = compareVersions(latestVersion, currentInfo.versionName) > 0;

    // Find APK asset in release assets
    let apkAsset = null;
    if (Array.isArray(release.assets)) {
      apkAsset = release.assets.find(a => a.name?.toLowerCase().endsWith('.apk'));
    }

    const downloadUrl = apkAsset?.browser_download_url ||
      `https://github.com/${GITHUB_REPO}/releases/download/${latestTag}/OtakuPlay-${latestTag}.apk`;

    // Check if user dismissed this specific version recently
    const dismissedVersion = localStorage.getItem(STORAGE_KEYS.DISMISSED_VERSION);
    const dismissedTime = parseInt(localStorage.getItem(STORAGE_KEYS.DISMISSED_TIME) || '0', 10);
    const isDismissed = !force && dismissedVersion === latestVersion && (now - dismissedTime < 1000 * 60 * 60 * 24);

    return {
      hasUpdate: isNewer,
      isDismissed,
      currentVersion: currentInfo.versionName,
      latestVersion,
      tag: latestTag,
      title: release.name || `OtakuPlay ${latestTag}`,
      changelog: release.body || 'New performance improvements, streaming optimizations, and bug fixes.',
      publishedAt: release.published_at,
      downloadUrl,
      apkSize: apkAsset?.size ? formatBytes(apkAsset.size) : '~15 MB',
      assetName: apkAsset?.name || `OtakuPlay-${latestTag}.apk`,
      releaseUrl: release.html_url,
      isNative: currentInfo.isNative,
      canInstallUnknownApps: currentInfo.canInstallUnknownApps,
    };
  } catch (error) {
    console.error('Failed to check for app update:', error);
    return {
      hasUpdate: false,
      error: error.message || 'Network error while checking updates',
    };
  }
}

/**
 * Dismiss update notification for 24 hours
 */
export function dismissUpdateForNow(version) {
  localStorage.setItem(STORAGE_KEYS.DISMISSED_VERSION, version);
  localStorage.setItem(STORAGE_KEYS.DISMISSED_TIME, String(Date.now()));
}

/**
 * Check if the app has permission to install unknown APKs
 */
export async function checkInstallPermission() {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const res = await OtaUpdater.checkInstallPermission();
    return !!res.granted;
  } catch (e) {
    console.warn('Could not check install permission:', e);
    return true;
  }
}

/**
 * Open Android Settings to grant REQUEST_INSTALL_PACKAGES
 */
export async function openInstallSettings() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await OtaUpdater.openInstallSettings();
  } catch (e) {
    console.error('Failed to open install settings:', e);
  }
}

/**
 * Start OTA update download and installation
 * @param {string} url - Direct APK download URL
 * @param {function} onProgress - Callback for progress events
 */
export async function startDownloadAndInstall(url, onProgress) {
  if (!Capacitor.isNativePlatform()) {
    // In web browser: trigger standard browser download
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'OtakuPlay.apk';
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return { browserDownload: true };
  }

  let progressListener = null;
  try {
    progressListener = await OtaUpdater.addListener('downloadProgress', (event) => {
      onProgress?.({
        status: event.status, // 'downloading' | 'completed' | 'cancelled' | 'error'
        progress: event.progress ?? 0,
        downloadedBytes: event.downloadedBytes ?? 0,
        totalBytes: event.totalBytes ?? 0,
        formattedDownloaded: formatBytes(event.downloadedBytes),
        formattedTotal: formatBytes(event.totalBytes),
        speed: formatSpeed(event.bytesPerSec),
        error: event.error,
      });
    });

    const result = await OtaUpdater.downloadAndInstall({ url });
    return result;
  } finally {
    if (progressListener) {
      progressListener.remove();
    }
  }
}

/**
 * Re-trigger installation of already-downloaded APK
 */
export async function installDownloadedApk() {
  if (!Capacitor.isNativePlatform()) return;
  return await OtaUpdater.installApk();
}

/**
 * Cancel an active download
 */
export async function cancelUpdate() {
  if (!Capacitor.isNativePlatform()) return;
  return await OtaUpdater.cancelDownload();
}
