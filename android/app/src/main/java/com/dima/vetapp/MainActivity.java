package com.dima.vetapp;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            WebView webView = this.bridge.getWebView();
            if (webView != null) {
                webView.getSettings().setTextZoom(100);
            }
        } catch (Exception e) {
            // если что-то пойдёт не так — просто игнорируем
        }
    }
}