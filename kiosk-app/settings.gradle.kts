pluginManagement {
    repositories {
        // Repo lokal (~/maven-repo) DIDAHULUKAN: HTTP client Gradle di-reset
        // oleh egress proxy VM ini, jadi semua artefak AGP/Kotlin diunduh
        // dulu via urllib/curl ke repo lokal. Repo remote hanya fallback.
        maven { url = uri("/home/hatch/maven-repo") }
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        maven { url = uri("/home/hatch/maven-repo") }
        google()
        mavenCentral()
    }
}
rootProject.name = "mihrab-kiosk"
include(":app")
