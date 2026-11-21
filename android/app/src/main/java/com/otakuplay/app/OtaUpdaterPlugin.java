package com.otakuplay.app;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
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
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "OtaUpdater")
public class OtaUpdaterPlugin extends Plugin {

    private static final String TAG = "OtaUpdater";
    private static final String UPDATE_FILE_NAME = "OtakuPlay-update.apk";

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
            (host.equals("github.com") && url.getPath() != null && url.getPath().contains("otaku-play")) ||
            host.contains("zokoanime.video") ||
            host.contains("anilist.co") ||
            host.contains("consumet.org")) {
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

                currentUrl = redirectUrl;
                hops++;
            } else {
                return conn;
            }
        }
        throw new Exception("Too many redirects (exceeded " + MAX_HOPS + ")");
    }
}
