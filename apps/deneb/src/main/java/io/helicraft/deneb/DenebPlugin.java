package io.helicraft.deneb;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import net.kyori.adventure.text.Component;
import org.bukkit.plugin.java.JavaPlugin;

public final class DenebPlugin extends JavaPlugin {
  private final WorldGeometry geometry = new WorldGeometry();
  private HttpClient http;

  @Override
  public void onEnable() {
    var command = getCommand("deneb");
    if (command == null) {
      throw new IllegalStateException("Missing /deneb command");
    }
    command.setExecutor(
        (sender, cmd, label, args) -> {
          sender.sendMessage(
              Component.text("Hello, HeliCraft! Distance from origin: " + geometry.distance(3, 4)));
          return true;
        });
    http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    String baseUrl = System.getenv().getOrDefault("ANTARES_URL", "http://localhost:3000");
    var request =
        HttpRequest.newBuilder(URI.create(baseUrl + "/api/health"))
            .timeout(Duration.ofSeconds(5))
            .GET()
            .build();
    http.sendAsync(request, HttpResponse.BodyHandlers.discarding())
        .thenAccept(response -> getLogger().info("Antares health HTTP " + response.statusCode()))
        .exceptionally(
            error -> {
              getLogger().warning("Antares unavailable");
              return null;
            });
  }

  @Override
  public void onDisable() {
    if (http != null) {
      http.shutdownNow();
    }
  }
}
