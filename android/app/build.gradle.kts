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
        /* One version for the whole project, owned by npm: `npm run release`
           bumps the root package.json, tags it, and this reads it back. The
           code is the number packed so 1.3.1 is 10301 - always climbing, which
           is what an update over an older install needs. */
        val version = (groovy.json.JsonSlurper().parse(rootProject.file("../package.json")) as Map<*, *>)["version"] as String
        // "2" or "2.1" is read as 2.0.0 or 2.1.0 rather than failing the build.
        val parts = (version.split(".").map { it.toIntOrNull() ?: 0 } + listOf(0, 0, 0)).take(3)
        versionCode = parts[0] * 10000 + parts[1] * 100 + parts[2]
        versionName = version
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
