# Capacitor WebView bridge — keep JavaScript interface
-keepclassmembers class * extends com.getcapacitor.BridgeActivity {
    public *;
}
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }

# Keep plugin classes and their methods accessible from JavaScript
-keep class com.montoit.app.** { *; }

# Keep native methods used by Capacitor plugins
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Gson/Reflection-based serialization used by plugins
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }

# Keep WebSocket and network classes
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**
