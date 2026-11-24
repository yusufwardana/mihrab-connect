import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val keystorePasswordFile = rootProject.file("keystore-password.txt")

android {
    namespace = "id.cosmiclabs.mihrabkiosk"
    compileSdk = 34

    defaultConfig {
        applicationId = "id.cosmiclabs.mihrabkiosk"
        minSdk = 23
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }

    signingConfigs {
        create("release") {
            storeFile = rootProject.file("keystore.jks")
            storePassword = if (keystorePasswordFile.exists()) keystorePasswordFile.readText().trim() else ""
            keyAlias = "mihrab-kiosk"
            keyPassword = if (keystorePasswordFile.exists()) keystorePasswordFile.readText().trim() else ""
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            isShrinkResources = false
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        // Tanpa view binding / compose — Views polos saja, APK ringan.
        viewBinding = false
        buildConfig = false
        aidl = false
        renderScript = false
        resValues = false
        shaders = false
    }
}

// Lint dimatikan untuk build release di VM ini: artefak lint
// (lint-gradle dkk.) tidak tersedia di repo Maven offline, dan lint adalah
// static analysis — bukan bagian dari APK. (checkRelease sudah dihapus di
// AGP 8.x, jadi task lint dinonaktifkan langsung.) Jalankan lint terpisah
// (`./gradlew lint`) di mesin dengan akses Maven bila dibutuhkan.
tasks.matching { it.name.startsWith("lint") }.configureEach {
    enabled = false
}

dependencies {
    // Hanya Kotlin stdlib (transitif). Tanpa OkHttp/Retrofit — HTTP pakai
    // HttpURLConnection + org.json bawaan Android.
}
