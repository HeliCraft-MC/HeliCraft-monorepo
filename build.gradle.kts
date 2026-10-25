import java.security.MessageDigest
import java.util.Properties

plugins {
    base
    id("com.diffplug.spotless") version "8.10.3" apply false
    id("com.gradleup.shadow") version "9.2.2" apply false
}
allprojects { group = "io.helicraft"; version = "0.1.0" }

val limboLock = Properties().apply { rootProject.file("infra/minecraft/limboapi.properties").inputStream().use { load(it) } }
val limboArtifact = layout.buildDirectory.file("minecraft/limboapi.jar")
tasks.register("downloadLimbo") {
    inputs.file("infra/minecraft/limboapi.properties")
    inputs.property("url", limboLock.getProperty("url"))
    inputs.property("sha256", limboLock.getProperty("sha256"))
    outputs.file(limboArtifact)
    doLast {
        val target = outputs.files.singleFile
        val expectedHash = inputs.properties.getValue("sha256").toString()
        fun hash(bytes: ByteArray) = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
        if (!target.exists() || hash(target.readBytes()) != expectedHash) {
            val connection = java.net.URI.create(inputs.properties.getValue("url").toString()).toURL().openConnection()
            connection.connectTimeout = 15000
            connection.readTimeout = 60000
            val bytes = connection.getInputStream().use { it.readBytes() }
            require(hash(bytes) == expectedHash) { "LimboAPI checksum mismatch; review and pin a new artifact, never accept latest silently" }
            target.parentFile.mkdirs()
            target.writeBytes(bytes)
        }
    }
}
