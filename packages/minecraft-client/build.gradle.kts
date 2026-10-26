plugins {
    `java-library`
    checkstyle
    id("com.diffplug.spotless") version "8.10.3"
}
repositories {
    mavenCentral()
    maven("https://repo.opencollab.dev/maven-releases/") {
        content {
            includeGroupByRegex("org\\.geysermc\\..*")
            includeGroupByRegex("org\\.cloudburstmc\\..*")
            includeGroupByRegex("com\\.nukkitx\\..*")
        }
    }
}
java { toolchain.languageVersion.set(JavaLanguageVersion.of(25)) }
dependencies {
    api("com.google.code.gson:gson:2.13.2")
    testImplementation("org.junit.jupiter:junit-jupiter:5.13.4")
    testImplementation("org.geysermc.mcprotocollib:protocol:26.3")
    testRuntimeOnly("org.slf4j:slf4j-simple:2.0.17")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher:1.13.4")
}
tasks.test { useJUnitPlatform() }
tasks.register("nativeClientClasspath") {
    dependsOn(tasks.testClasses)
    val classpath = sourceSets.test.get().runtimeClasspath
    val target = rootProject.layout.buildDirectory.file("minecraft/native-client-classpath.txt")
    inputs.files(classpath)
    outputs.file(target)
    doLast {
        target.get().asFile.apply { parentFile.mkdirs(); writeText(classpath.asPath) }
    }
}
checkstyle {
    toolVersion = "14.3.0"
    configFile = rootProject.file("config/checkstyle/checkstyle.xml")
    maxWarnings = 0
}
spotless { java { googleJavaFormat("1.30.0"); removeUnusedImports(); forbidWildcardImports(); trimTrailingWhitespace(); endWithNewline() } }
tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
    options.compilerArgs.addAll(listOf("-Xlint:all,-processing", "-Werror"))
}
