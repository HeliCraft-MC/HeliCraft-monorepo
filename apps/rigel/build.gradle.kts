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
    implementation(project(":minecraft-client"))
    compileOnly(files(rootProject.layout.buildDirectory.file("minecraft/limboapi.jar")))
    compileOnly("com.velocitypowered:velocity-api:4.2.0")
    annotationProcessor("com.velocitypowered:velocity-api:4.2.0")
    testImplementation("org.junit.jupiter:junit-jupiter:5.13.4")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher:1.13.4")
}
tasks.test { useJUnitPlatform() }
tasks.shadowJar {
    relocate("com.google.gson", "io.helicraft.rigel.libs.gson")
    archiveFileName.set("rigel.jar")
    
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

tasks.compileJava { dependsOn(rootProject.tasks.named("downloadLimbo")) }
