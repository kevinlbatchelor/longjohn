plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.longjohn.tv"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.longjohn.tv"
        // 26 is Android 8: every Google TV and any phone from 2017 on, and the
        // first release with adaptive icons, which is all the icon this app has.
        minSdk = 26
        targetSdk = 34
        versionCode = 4
        // A master build carries the commit it came from: "1.2-6466521".
        versionName = "1.3" + (project.findProperty("versionSuffix") ?: "")
    }

    /* Signed with a key that lives in the repo. This app is sideloaded onto
       our own devices and never goes near a store, and a stable key is what
       lets a new build install over the old one instead of demanding an
       uninstall first. */
    signingConfigs {
        create("sideload") {
            storeFile = rootProject.file("keystore/longjohn-sideload.jks")
            storePassword = "longjohn"
            keyAlias = "longjohn"
            keyPassword = "longjohn"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("sideload")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.2")
}
