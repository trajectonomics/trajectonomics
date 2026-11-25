import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("rust")
}

val tauriProperties = Properties().apply {
    val propFile = file("tauri.properties")
    if (propFile.exists()) {
        propFile.inputStream().use { load(it) }
    }
}

val keystoreProperties = Properties().apply {
    val candidates = listOf(
        rootProject.file("keystore.properties"),
        rootProject.file("../../keystore.properties")
    )
    for (candidate in candidates) {
        if (candidate.exists()) {
            candidate.inputStream().use { load(it) }
            break
        }
    }
}

fun signingValue(envName: String, propName: String): String? {
    val fromEnv = System.getenv(envName)?.takeIf { it.isNotBlank() }
    if (fromEnv != null) return fromEnv
    return keystoreProperties.getProperty(propName)?.takeIf { it.isNotBlank() }
}

fun versionCodeFromName(versionName: String): Int {
    val parts = versionName.split(".").mapNotNull { it.toIntOrNull() }
    val major = parts.getOrElse(0) { 0 }
    val minor = parts.getOrElse(1) { 0 }
    val patch = parts.getOrElse(2) { 0 }
    // Same formula the Tauri CLI writes to tauri.properties, so a build without that file
    // can't produce a lower versionCode than a published release.
    return major * 1000000 + minor * 1000 + patch
}

android {
    compileSdk = 37
    namespace = "app.moojot.android"
    defaultConfig {
        manifestPlaceholders["usesCleartextTraffic"] = "false"
        applicationId = "app.moojot.android"
        minSdk = 24
        targetSdk = 37
        val resolvedVersionName = tauriProperties.getProperty("tauri.android.versionName", "1.0.0")
        versionName = resolvedVersionName
        versionCode = tauriProperties.getProperty("tauri.android.versionCode")?.toIntOrNull()
            ?: versionCodeFromName(resolvedVersionName)
    }
    signingConfigs {
        create("release") {
            val storePath = signingValue("ANDROID_KEYSTORE_PATH", "storeFile")
            val storePass = signingValue("ANDROID_KEYSTORE_PASSWORD", "storePassword")
            val alias = signingValue("ANDROID_KEY_ALIAS", "keyAlias")
            val keyPass = signingValue("ANDROID_KEY_PASSWORD", "keyPassword")
            if (!storePath.isNullOrBlank() && !storePass.isNullOrBlank() && !alias.isNullOrBlank() && !keyPass.isNullOrBlank()) {
                storeFile = file(storePath)
                storePassword = storePass
                keyAlias = alias
                keyPassword = keyPass
            }
        }
    }
    buildTypes {
        getByName("debug") {
            manifestPlaceholders["usesCleartextTraffic"] = "true"
            isDebuggable = true
            isJniDebuggable = true
            isMinifyEnabled = false
            packaging {
                jniLibs.keepDebugSymbols.add("*/arm64-v8a/*.so")
                jniLibs.keepDebugSymbols.add("*/armeabi-v7a/*.so")
                jniLibs.keepDebugSymbols.add("*/x86/*.so")
                jniLibs.keepDebugSymbols.add("*/x86_64/*.so")
            }
        }
        getByName("release") {
            val releaseSigning = signingConfigs.getByName("release")
            if (releaseSigning.storeFile != null) {
                signingConfig = releaseSigning
            }
            optimization {
               enable = true
            }
            proguardFiles(
                *fileTree(".") {
                  include("**/*.pro")
                  exclude("build/**")
                }.files.toTypedArray()
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    buildFeatures {
        buildConfig = true
    }
}

kotlin {
    compilerOptions {
        jvmTarget = JvmTarget.JVM_1_8
    }
}

rust {
    rootDirRel = "../../../"
}

dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.lifecycle:lifecycle-process:2.10.0")
    implementation("com.google.zxing:core:3.5.3")
    implementation("com.google.mlkit:text-recognition:16.0.1")
    implementation("com.google.android.gms:play-services-tasks:18.2.0")
    implementation("com.microsoft.onnxruntime:onnxruntime-android:1.22.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.4")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.0")
}

apply(from = file("tauri.build.gradle.kts"))
