package io.helicraft.rigel;

import com.google.inject.Inject;
import com.velocitypowered.api.event.Subscribe;
import com.velocitypowered.api.event.proxy.ProxyInitializeEvent;
import com.velocitypowered.api.event.proxy.ProxyShutdownEvent;
import com.velocitypowered.api.plugin.Plugin;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.slf4j.Logger;

@Plugin(
    id = "rigel",
    name = "Rigel",
    version = "0.1.0",
    description = "HeliCraft identity foundation",
    authors = {"HeliCraft"})
public final class RigelPlugin {
  private final Logger logger;
  private HttpClient http;

  @Inject
  public RigelPlugin(Logger logger) {
    this.logger = logger;
  }

  @Subscribe
  public void onInitialize(ProxyInitializeEvent event) {
    logger.info(
        "Hello, HeliCraft! Rigel loaded; custom identity authentication is not implemented.");
    http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    String baseUrl = System.getenv().getOrDefault("ANTARES_URL", "http://localhost:3000");
    var request =
        HttpRequest.newBuilder(URI.create(baseUrl + "/api/health"))
            .timeout(Duration.ofSeconds(5))
            .GET()
            .build();
    http.sendAsync(request, HttpResponse.BodyHandlers.discarding())
        .thenAccept(response -> logger.info("Antares health HTTP {}", response.statusCode()))
        .exceptionally(
            error -> {
              logger.warn("Antares unavailable");
              return null;
            });
  }

  @Subscribe
  public void onShutdown(ProxyShutdownEvent event) {
    if (http != null) {
      http.shutdownNow();
    }
  }
}
