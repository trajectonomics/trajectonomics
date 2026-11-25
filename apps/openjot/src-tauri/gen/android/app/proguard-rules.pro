# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ML Kit lists its component registrars in <meta-data> and creates each one by
# reflection with its no-arg constructor. The library's own rules keep the class
# names, but R8 full mode then drops the constructors, so ML Kit never starts and
# slip OCR returns no text (#45).
-keep class * implements com.google.firebase.components.ComponentRegistrar {
    <init>();
}

# ONNX Runtime (Thai slip OCR) ships no keep rules. Its JNI library looks up these
# classes, constructors and fields by name, so keep the package as published (#45).
-keep class ai.onnxruntime.** { *; }
