package com.otakuplay.app;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import androidx.core.content.pm.PackageInfoCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "OtaUpdater")
public class OtaUpdaterPlugin extends Plugin {

    private static final String TAG = "OtaUpdater";
    private static final String UPDATE_FILE_NAME = "OtakuPlay-update.apk";
    // Updates may only be fetched from this project's GitHub releases
    private static final String RELEASE_PATH_PREFIX = "/chimt4chi/otaku-play/releases/download/";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean isCancelled = new AtomicBoolean(false);
    private final AtomicBoolean isDownloading = new AtomicBoolean(false);

    @PluginMethod
    public void getAppInfo(PluginCall call) {
        JSObject ret = new JSObject();
        Context context = getContext();
        try {
            PackageInfo pInfo = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            ret.put("versionName", pInfo.versionName);
            ret.put("versionCode", PackageInfoCompat.getLongVersionCode(pInfo));
            ret.put("packageName", context.getPackageName());
            ret.put("canInstallUnknownApps", canInstallUnknownApps());
            call.resolve(ret);
        } catch (Exception e) {
            Logger.error(TAG, "Failed to get app package info", e);
            call.reject("Could not retrieve app info: " + e.getMessage());
        }
    }

    @PluginMethod
    public void checkInstallPermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", canInstallUnknownApps());
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                Uri packageUri = Uri.parse("package:" + context.getPackageName());
                Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, packageUri);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                call.resolve();
            } catch (Exception e) {
                Logger.error(TAG, "Failed to open install settings", e);
                // Fallback to generic security settings
                try {
                    Intent fallback = new Intent(Settings.ACTION_SECURITY_SETTINGS);
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(fallback);
                    call.resolve();
                } catch (Exception ex) {
                    call.reject("Unable to open settings: " + ex.getMessage());
                }
            }
        } else {
            call.resolve();
        }
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {
        isCancelled.set(true);
        isDownloading.set(false);
        JSObject ret = new JSObject();
        ret.put("cancelled", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        File apkFile = getUpdateApkFile();
        if (!apkFile.exists() || apkFile.length() == 0) {
            call.reject("No downloaded update APK found to install.");
            return;
        }

        try {
            verifyApk(apkFile);
            launchInstaller(apkFile);
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("fileSize", apkFile.length());
            call.resolve(ret);
        } catch (Exception e) {
            Logger.error(TAG, "Failed to launch package installer", e);
            call.reject("Installation failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String downloadUrl = call.getString("url");
        if (downloadUrl == null || downloadUrl.trim().isEmpty()) {
            call.reject("Download URL is required");
            return;
        }

        try {
            URL parsed = new URL(downloadUrl);
            String h = parsed.getHost() == null ? "" : parsed.getHost().toLowerCase(Locale.ROOT);
            if (!"https".equals(parsed.getProtocol()) || !h.equals("github.com")
                || parsed.getPath() == null || !parsed.getPath().startsWith(RELEASE_PATH_PREFIX)) {
                call.reject("Update URL is not an official OtakuPlay release");
                return;
            }
        } catch (Exception e) {
            call.reject("Invalid update URL");
            return;
        }

        final String expectedSha256 = normalizeSha256(call.getString("sha256"));

        if (isDownloading.get()) {
            call.reject("A download is already in progress.");
            return;
        }

        isCancelled.set(false);
        isDownloading.set(true);

        executor.execute(() -> {
            File apkFile = getUpdateApkFile();
            File tempFile = new File(apkFile.getParentFile(), "OtakuPlay-update.apk.tmp");

            HttpURLConnection connection = null;
            InputStream inputStream = null;
            FileOutputStream outputStream = null;

            try {
                // Ensure parent directory exists
                File dir = apkFile.getParentFile();
                if (dir != null && !dir.exists()) {
                    dir.mkdirs();
                }

                if (tempFile.exists()) {
                    tempFile.delete();
                }

                connection = openFollowRedirects(downloadUrl);
                int responseCode = connection.getResponseCode();

                if (responseCode != HttpURLConnection.HTTP_OK) {
                    throw new Exception("Server responded with HTTP " + responseCode);
                }

                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                long totalBytes = connection.getContentLengthLong();
                inputStream = connection.getInputStream();
                outputStream = new FileOutputStream(tempFile);

                byte[] buffer = new byte[16384]; // 16KB chunk
                long downloadedBytes = 0;
                long startTime = System.currentTimeMillis();
                long lastNotifyTime = 0;
                int read;

                while ((read = inputStream.read(buffer)) != -1) {
                    if (isCancelled.get()) {
                        throw new InterruptedException("Download cancelled by user");
                    }

                    outputStream.write(buffer, 0, read);
                    digest.update(buffer, 0, read);
                    downloadedBytes += read;

                    long now = System.currentTimeMillis();
                    // Throttle notification to every 150ms for smooth UI updates
                    if (now - lastNotifyTime >= 150 || (totalBytes > 0 && downloadedBytes == totalBytes)) {
                        lastNotifyTime = now;
                        int progress = totalBytes > 0 ? (int) ((downloadedBytes * 100) / totalBytes) : -1;
                        long elapsedMs = Math.max(1, now - startTime);
                        long bytesPerSec = (downloadedBytes * 1000) / elapsedMs;

                        JSObject progressData = new JSObject();
                        progressData.put("status", "downloading");
                        progressData.put("progress", progress);
                        progressData.put("downloadedBytes", downloadedBytes);
                        progressData.put("totalBytes", totalBytes);
                        progressData.put("bytesPerSec", bytesPerSec);
                        notifyListeners("downloadProgress", progressData, false);
                    }
                }

                outputStream.flush();
                outputStream.close();
                outputStream = null;

                if (expectedSha256 != null && !expectedSha256.equals(toHex(digest.digest()))) {
                    throw new Exception("Checksum mismatch - download rejected");
                }
                verifyApk(tempFile);

                if (apkFile.exists()) {
                    apkFile.delete();
                }

                if (!tempFile.renameTo(apkFile)) {
                    throw new Exception("Failed to finalize downloaded APK file");
                }

                isDownloading.set(false);

                // Notify UI that download completed
                JSObject completedData = new JSObject();
                completedData.put("status", "completed");
                completedData.put("progress", 100);
                completedData.put("downloadedBytes", downloadedBytes);
                completedData.put("totalBytes", totalBytes);
                notifyListeners("downloadProgress", completedData, false);

                // Launch Android Package Installer
                launchInstaller(apkFile);

                JSObject result = new JSObject();
                result.put("success", true);
                result.put("fileSize", apkFile.length());
                call.resolve(result);

            } catch (InterruptedException ie) {
                isDownloading.set(false);
                if (tempFile.exists()) {
                    tempFile.delete();
                }
                JSObject cancelledData = new JSObject();
                cancelledData.put("status", "cancelled");
                notifyListeners("downloadProgress", cancelledData, false);
                call.reject("Download cancelled");
            } catch (Exception e) {
                isDownloading.set(false);
                if (tempFile.exists()) {
                    tempFile.delete();
                }
                Logger.error(TAG, "Error downloading update APK", e);

                JSObject errorData = new JSObject();
                errorData.put("status", "error");
                errorData.put("error", e.getMessage());
                notifyListeners("downloadProgress", errorData, false);

                call.reject("Update download failed: " + e.getMessage());
            } finally {
                try {
                    if (inputStream != null) inputStream.close();
                } catch (Exception ignored) {}
                try {
                    if (outputStream != null) outputStream.close();
                } catch (Exception ignored) {}
                if (connection != null) {
                    connection.disconnect();
                }
            }
        });
    }

    private static String normalizeSha256(String raw) {
        if (raw == null) return null;
        String v = raw.trim().toLowerCase(Locale.ROOT);
        if (v.startsWith("sha256:")) v = v.substring(7);
        return v.matches("[0-9a-f]{64}") ? v : null;
    }

    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    /**
     * Rejects any APK that is not this app signed with the same certificate as the
     * installed build, before handing the file to the system installer.
     */
    @SuppressWarnings("deprecation")
    private void verifyApk(File apk) throws Exception {
        Context context = getContext();
        PackageManager pm = context.getPackageManager();
        boolean modern = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P;
        int flags = modern ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;

        PackageInfo archive = pm.getPackageArchiveInfo(apk.getAbsolutePath(), flags);
        if (archive == null) throw new Exception("Downloaded file is not a valid APK");
        if (!context.getPackageName().equals(archive.packageName)) {
            throw new Exception("Downloaded APK is for a different app");
        }

        PackageInfo installed = pm.getPackageInfo(context.getPackageName(), flags);
        Signature[] a = signaturesOf(archive, modern);
        Signature[] b = signaturesOf(installed, modern);
        if (a == null || b == null || a.length == 0 || !Arrays.equals(a, b)) {
            throw new Exception("Downloaded APK signature does not match the installed app");
        }
    }

    @SuppressWarnings("deprecation")
    private static Signature[] signaturesOf(PackageInfo info, boolean modern) {
        if (!modern) return info.signatures;
        SigningInfo si = info.signingInfo;
        if (si == null) return null;
        return si.hasMultipleSigners() ? si.getApkContentsSigners() : si.getSigningCertificateHistory();
    }

    private void launchInstaller(File apkFile) throws Exception {
        Context context = getContext();
        Uri apkUri = FileProvider.getUriForFile(
            context,
            context.getPackageName() + ".fileprovider",
            apkFile
        );

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        context.startActivity(intent);
    }

    private File getUpdateApkFile() {
        Context context = getContext();
        File dir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (dir == null) {
            dir = new File(context.getCacheDir(), "updates");
        }
        return new File(dir, UPDATE_FILE_NAME);
    }

    private boolean canInstallUnknownApps() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return getContext().getPackageManager().canRequestPackageInstalls();
        }
        return true;
    }

    @Override
    public Boolean shouldOverrideLoad(Uri url) {
        if (url == null) return null;
        String host = url.getHost();
        if (host == null) return null;

        host = host.toLowerCase();
        // Allow app internal host, legitimate video origins, and intentional GitHub release links
        if (host.equals("localhost") ||
            (host.equals("github.com") && url.getPath() != null && url.getPath().startsWith("/chimt4chi/otaku-play")) ||
            host.equals("zokoanime.video") || host.endsWith(".zokoanime.video") ||
            host.equals("anilist.co") || host.endsWith(".anilist.co") ||
            host.equals("consumet.org") || host.endsWith(".consumet.org")) {
            return null; // Allow standard handling
        }

        // Intercept and block rogue ad redirects from launching external Chrome/browser
        Logger.info(TAG, "Blocked external ad redirect intent: " + url);
        return Boolean.TRUE;
    }

    /**
     * Follows HTTP 301, 302, 303, 307, 308 redirects up to 7 hops.
     * Crucial for GitHub Releases which redirect to AWS S3 storage.
     */
    private HttpURLConnection openFollowRedirects(String initialUrl) throws Exception {
        String currentUrl = initialUrl;
        int hops = 0;
        final int MAX_HOPS = 7;

        while (hops < MAX_HOPS) {
            URL url = new URL(currentUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setRequestProperty("User-Agent", "OtakuPlay-Android-Updater");
            conn.setConnectTimeout(20000);
            conn.setReadTimeout(30000);

            int status = conn.getResponseCode();
            if (status == HttpURLConnection.HTTP_MOVED_TEMP
                || status == HttpURLConnection.HTTP_MOVED_PERM
                || status == HttpURLConnection.HTTP_SEE_OTHER
                || status == 307
                || status == 308) {

                String redirectUrl = conn.getHeaderField("Location");
                conn.disconnect();

                if (redirectUrl == null || redirectUrl.isEmpty()) {
                    throw new Exception("Redirect without Location header");
                }

                // Handle relative redirect URL if any
                if (!redirectUrl.startsWith("http://") && !redirectUrl.startsWith("https://")) {
                    URL base = new URL(currentUrl);
                    redirectUrl = new URL(base, redirectUrl).toExternalForm();
                }

                URL next = new URL(redirectUrl);
                String nh = next.getHost() == null ? "" : next.getHost().toLowerCase(Locale.ROOT);
                if (!"https".equals(next.getProtocol())
                    || !(nh.equals("github.com") || nh.endsWith(".githubusercontent.com"))) {
                    throw new Exception("Update redirected to an untrusted location");
                }

                currentUrl = redirectUrl;
                hops++;
            } else {
                return conn;
            }
        }
        throw new Exception("Too many redirects (exceeded " + MAX_HOPS + ")");
    }
}
