package com.otakuplay.app;

import android.app.UiModeManager;
import android.content.Context;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Native side of the player's fullscreen mode. Capacitor's WebChromeClient discards the
 * WebView's fullscreen view, so the web layer draws "fullscreen" itself (fixed overlay) and
 * calls this to hide system bars, lock landscape and keep the screen awake.
 */
@CapacitorPlugin(name = "PlayerNative")
public class PlayerNativePlugin extends Plugin {

    private boolean keepAwakeRequested = false;
    private boolean fullscreen = false;

    @PluginMethod
    public void getDeviceInfo(PluginCall call) {
        UiModeManager uiMode = (UiModeManager) getContext().getSystemService(Context.UI_MODE_SERVICE);
        boolean isTv = (uiMode != null && uiMode.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION)
            || getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_LEANBACK);
        if (isTv) {
            // Remote key presses only reach the page while the WebView holds focus
            getActivity().runOnUiThread(() -> getBridge().getWebView().requestFocus());
        }
        JSObject ret = new JSObject();
        ret.put("isTv", isTv);
        call.resolve(ret);
    }

    @PluginMethod
    public void setFullscreen(PluginCall call) {
        final boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        getActivity().runOnUiThread(() -> {
            try {
                fullscreen = enabled;
                Window window = getActivity().getWindow();
                WindowInsetsControllerCompat controller =
                    WindowCompat.getInsetsController(window, window.getDecorView());
                if (enabled) {
                    controller.setSystemBarsBehavior(
                        WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                    controller.hide(WindowInsetsCompat.Type.systemBars());
                    getActivity().setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                } else {
                    controller.show(WindowInsetsCompat.Type.systemBars());
                    getActivity().setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
                }
                applyKeepAwake(window);
                JSObject ret = new JSObject();
                ret.put("enabled", enabled);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Fullscreen change failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void setKeepAwake(PluginCall call) {
        final boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        getActivity().runOnUiThread(() -> {
            keepAwakeRequested = enabled;
            applyKeepAwake(getActivity().getWindow());
            call.resolve();
        });
    }

    private void applyKeepAwake(Window window) {
        if (keepAwakeRequested || fullscreen) {
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        } else {
            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
    }
}
