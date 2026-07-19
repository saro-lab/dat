import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import java.net.HttpURLConnection
import java.net.URI
import java.util.*

plugins {
    id("org.jetbrains.kotlin.jvm") version "2.4.10"
	id("org.ec4j.editorconfig") version "0.1.0"
	id("idea")
	signing
	`maven-publish`
}

val datGroupId = "me.saro"
val datArtifactId = "dat"
val datVersion = "4.3.5"

group = datGroupId
version = datVersion

repositories {
	mavenCentral()
}

dependencies {
    implementation("org.bouncycastle:bcprov-jdk18on:1.84")
    compileOnly("org.slf4j:slf4j-api:2.0.18")

	// test
    val junitVer = "6.1.1"
	testImplementation("org.junit.jupiter:junit-jupiter:$junitVer")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher:$junitVer")
    testImplementation("ch.qos.logback:logback-classic:1.5.38")
}

java {
    withJavadocJar()
    withSourcesJar()
}

tasks.withType<Test> {
	useJUnitPlatform {
        excludeTags("benchmark")
    }
	testLogging {
        events("passed", "skipped", "failed", "standardOut", "standardError")
		showStandardStreams = true
	}
    jvmArgs("-XX:+TieredCompilation")
}

tasks.withType<Javadoc>().configureEach {
	options {
		this as StandardJavadocDocletOptions
		addBooleanOption("Xdoclint:none", true)
	}
}

configure<JavaPluginExtension> {
	sourceCompatibility = JavaVersion.VERSION_17
	targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}


publishing {
    publications {
        create<MavenPublication>("maven") {

            groupId = datGroupId
            artifactId = datArtifactId
            version = datVersion

            from(components["java"])

            repositories {
                maven {
                    credentials {
                        try {
                            username = project.property("sonatype.username").toString()
                            password = project.property("sonatype.password").toString()
                        } catch (e: Exception) {
                            println("warn: " + e.message)
                        }
                    }
                    name = "ossrh-staging-api"
                    url = uri("https://ossrh-staging-api.central.sonatype.com/service/local/staging/deploy/maven2/")
                }
            }

            pom {
                name.set("SARO DAT")
                description.set("DAT - Distributed Access Token (dat, distributed, access, token, web session)")
                url.set("https://dat.saro.me")

                properties.set(mapOf(
                    "keywords" to "dat, distributed, access, token, web_session"
                ))

                licenses {
                    license {
                        name.set("The Apache License, Version 2.0")
                        url.set("http://www.apache.org/licenses/LICENSE-2.0.txt")
                    }
                }
                developers {
                    developer {
                        name.set("PARK Yong Seo")
                        email.set("j@saro.me")
                    }
                }
                scm {
                    connection.set("scm:git:git://github.com/saro-lab/dat-maven.git")
                    developerConnection.set("scm:git:git@github.com:saro-lab/dat-maven.git")
                    url.set("https://github.com/saro-lab/dat-maven")
                }
            }
        }
    }
}

tasks.named("publish").configure {
    doLast {
        println("Ready, upload to Central Portal")
        val username = project.property("sonatype.username").toString()
        val password = project.property("sonatype.password").toString()
        val connection = URI.create("https://ossrh-staging-api.central.sonatype.com/manual/upload/defaultRepository/$datGroupId").toURL().openConnection() as HttpURLConnection
        connection.requestMethod = "POST"
        connection.setRequestProperty("Authorization", "Basic " + Base64.getEncoder().encodeToString("$username:$password".toByteArray()))
        connection.setRequestProperty("Content-Type", "application/json")
        connection.doOutput = true
        connection.outputStream.write("""{"publishing_type": "automatic"}""".toByteArray())
        val responseCode = connection.responseCode
        if (responseCode in 200..299) {
            println("Successfully uploaded to Central Portal")
        } else {
            throw GradleException("Failed to upload to Central Portal: $responseCode - ${connection.inputStream?.bufferedReader()?.readText()}")
        }
    }
}

signing {
    sign(publishing.publications["maven"])
}
