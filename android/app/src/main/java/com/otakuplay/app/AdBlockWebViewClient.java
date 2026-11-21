package com.otakuplay.app;

import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.Logger;

import java.io.ByteArrayInputStream;

public class AdBlockWebViewClient extends BridgeWebViewClient {

    private static final String TAG = "AdBlock";

    public AdBlockWebViewClient(Bridge bridge) {
        super(bridge);
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        if (request != null && request.getUrl() != null) {
            Uri uri = request.getUrl();
            String host = uri.getHost();
            String urlStr = uri.toString().toLowerCase();

            if (isAdResource(host, urlStr)) {
                Logger.info(TAG, "Blocked ad / tracking request: " + urlStr);
                // Return empty 200 OK text response so the ad script/pixel is neutralized immediately
                return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream("".getBytes()));
            }
        }
        return super.shouldInterceptRequest(view, request);
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        if (request != null && request.getUrl() != null) {
            Uri uri = request.getUrl();
            String host = uri.getHost();
            if (host != null) {
                host = host.toLowerCase();
            }

            // Block ad redirects, popunder schemes, and shady external hops
            if (isAdResource(host, uri.toString().toLowerCase())) {
                Logger.info(TAG, "Blocked ad redirect navigation: " + uri);
                return true; // true = handled, do not navigate or open external browser
            }
        }
        return super.shouldOverrideUrlLoading(view, request);
    }

    private boolean isAdResource(String host, String url) {
        if (host == null && url == null) return false;

        String checkHost = host != null ? host.toLowerCase() : "";
        String checkUrl = url != null ? url.toLowerCase() : "";

        // Known anime video host ad networks, popunders, click-hijackers & trackers
        if (checkHost.contains("butchestusker.com") ||
            checkHost.contains("adsterra") ||
            checkHost.contains("popads") ||
            checkHost.contains("propellerads") ||
            checkHost.contains("exoclick") ||
            checkHost.contains("bet365") ||
            checkHost.contains("1xbet") ||
            checkHost.contains("monetag") ||
            checkHost.contains("highrevenuegate") ||
            checkHost.contains("doubleclick") ||
            checkHost.contains("googleadservices") ||
            checkHost.contains("googlesyndication") ||
            checkHost.contains("clickadu") ||
            checkHost.contains("adnxs") ||
            checkHost.contains("juicyads") ||
            checkHost.contains("hilltopads") ||
            checkHost.contains("trafficjunky") ||
            checkHost.contains("adx") ||
            checkHost.contains("popcash") ||
            checkHost.contains("onclick") ||
            checkHost.contains("yadro.ru") ||
            checkUrl.contains("/adbar") ||
            checkUrl.contains("google_ads") ||
            checkUrl.contains("popunder") ||
            checkUrl.contains("/banner/") ||
            checkUrl.contains("zone_id=") ||
            checkUrl.contains("ad_type=")) {
            return true;
        }

        return false;
    }
}
