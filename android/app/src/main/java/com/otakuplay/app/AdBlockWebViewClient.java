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

    // Hosts the app itself depends on: never filtered (AniList banner URLs contain "/banner/")
    private static final String[] TRUSTED_DOMAINS = {
        "localhost", "anilist.co", "zokoanime.video", "github.com",
        "githubusercontent.com", "peerjs.com", "twilio.com", "google.com", "gstatic.com"
    };

    // Registrable domains of ad / tracking networks (matches the domain and any subdomain)
    private static final String[] BLOCKED_DOMAINS = {
        "butchestusker.com", "doubleclick.net", "googleadservices.com", "googlesyndication.com",
        "adnxs.com", "yadro.ru"
    };

    // Distinctive ad-network brand names that appear inside rotating domains
    private static final String[] BLOCKED_HOST_TOKENS = {
        "adsterra", "popads", "propellerads", "exoclick", "bet365", "1xbet", "monetag",
        "highrevenuegate", "clickadu", "juicyads", "hilltopads", "trafficjunky", "popcash"
    };

    private static boolean matchesDomain(String host, String[] domains) {
        for (String d : domains) {
            if (host.equals(d) || host.endsWith("." + d)) return true;
        }
        return false;
    }

    private boolean isAdResource(String host, String url) {
        String checkHost = host != null ? host.toLowerCase() : "";
        String checkUrl = url != null ? url.toLowerCase() : "";
        if (checkHost.isEmpty()) return false;

        if (matchesDomain(checkHost, TRUSTED_DOMAINS)) return false;
        if (matchesDomain(checkHost, BLOCKED_DOMAINS)) return true;

        for (String token : BLOCKED_HOST_TOKENS) {
            if (checkHost.contains(token)) return true;
        }

        // Third-party URL patterns typical of popunders and ad zones
        return checkUrl.contains("/adbar") ||
            checkUrl.contains("google_ads") ||
            checkUrl.contains("popunder") ||
            checkUrl.contains("zone_id=") ||
            checkUrl.contains("ad_type=");
    }
}
