plugins {
    java
    checkstyle
    id("com.diffplug.spotless") version "8.10.3"
    id("com.gradleup.shadow") version "9.2.2"
}
repositories {
    mavenCentral()
    maven("https://repo.papermc.io/repository/maven-public/")
}
java { toolchain.languageVersion.set(JavaLanguageVersion.of(25)) }
dependencies {
    compileOnly("io.papermc.paper:paper-api:26.2.build.129-stable")
    compileOnly("net.kyori:adventure-api:4.25.0")
    implementation("org.locationtech.jts:jts-core:1.20.0")
    implementation("com.github.ben-manes.caffeine:caffeine:3.2.2")
    testImplementation("org.junit.jupiter:junit-jupiter:5.13.4")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher:1.13.4")
}
tasks.test { useJUnitPlatform() }
tasks.shadowJar {
    archiveFileName.set("deneb.jar")
    relocate("org.locationtech.jts", "io.helicraft.deneb.libs.jts"); relocate("com.github.benmanes.caffeine", "io.helicraft.deneb.libs.caffeine")
}
tasks.build { dependsOn(tasks.shadowJar) }

checkstyle {
    toolVersion = "14.3.0"
    configFile = rootProject.file("config/checkstyle/checkstyle.xml")
    isIgnoreFailures = false
    maxWarnings = 0
}
spotless {
    java {
        googleJavaFormat("1.30.0")
        removeUnusedImports()
        forbidWildcardImports()
        trimTrailingWhitespace()
        endWithNewline()
    }
}
tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
    options.compilerArgs.addAll(listOf("-Xlint:all,-processing", "-Werror"))
}
