package com.montoit.app;

import android.Manifest;
import android.animation.ObjectAnimator;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.LinearInterpolator;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    private static final int PERMISSION_REQUEST_CODE = 1001;
    private static final long SPLASH_MAX_TIMEOUT_MS = 15000L;
    private static final long POLL_INTERVAL_MS = 100L;

    private View splashOverlay;
    private long splashStartedAt;
    private boolean splashHidden = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        showSplashOverlay();
        watchPageLoad();
        requestRequiredPermissions();
    }

    /**
     * Demande au runtime toutes les permissions "dangereuses" requises par l'app.
     * Sans ça, Android 6+ refuse silencieusement camera/mic/location/notif même si déclarés au manifest.
     */
    private void requestRequiredPermissions() {
        List<String> toRequest = new ArrayList<>();

        String[] always = new String[] {
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        };
        for (String p : always) {
            if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                toRequest.add(p);
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            String[] tiramisu = new String[] {
                Manifest.permission.POST_NOTIFICATIONS,
                Manifest.permission.READ_MEDIA_IMAGES,
                Manifest.permission.READ_MEDIA_VIDEO,
            };
            for (String p : tiramisu) {
                if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                    toRequest.add(p);
                }
            }
        } else {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                toRequest.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            }
        }

        if (!toRequest.isEmpty()) {
            ActivityCompat.requestPermissions(this, toRequest.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        }
    }

    private void showSplashOverlay() {
        ViewGroup root = findViewById(android.R.id.content);
        splashOverlay = LayoutInflater.from(this).inflate(R.layout.activity_splash, root, false);
        root.addView(splashOverlay);
        splashStartedAt = System.currentTimeMillis();

        animateDot(splashOverlay.findViewById(R.id.dot1), 0L);
        animateDot(splashOverlay.findViewById(R.id.dot2), 200L);
        animateDot(splashOverlay.findViewById(R.id.dot3), 400L);
    }

    private void animateDot(View dot, long startDelay) {
        if (dot == null) return;
        ObjectAnimator anim = ObjectAnimator.ofFloat(dot, "alpha", 0.25f, 1f, 0.25f);
        anim.setDuration(1000L);
        anim.setStartDelay(startDelay);
        anim.setRepeatCount(ObjectAnimator.INFINITE);
        anim.setInterpolator(new LinearInterpolator());
        anim.start();
    }

    private void watchPageLoad() {
        final Handler handler = new Handler(Looper.getMainLooper());
        handler.post(new Runnable() {
            @Override
            public void run() {
                if (splashHidden) return;
                WebView webView = (getBridge() != null) ? getBridge().getWebView() : null;
                long elapsed = System.currentTimeMillis() - splashStartedAt;
                if (webView != null && webView.getProgress() >= 100) {
                    hideSplashOverlay();
                } else if (elapsed >= SPLASH_MAX_TIMEOUT_MS) {
                    hideSplashOverlay();
                } else {
                    handler.postDelayed(this, POLL_INTERVAL_MS);
                }
            }
        });
    }

    private void hideSplashOverlay() {
        if (splashHidden || splashOverlay == null) return;
        splashHidden = true;
        splashOverlay.animate()
            .alpha(0f)
            .setDuration(300L)
            .withEndAction(new Runnable() {
                @Override
                public void run() {
                    ViewGroup parent = (ViewGroup) splashOverlay.getParent();
                    if (parent != null) parent.removeView(splashOverlay);
                    splashOverlay = null;
                }
            })
            .start();
    }
}
