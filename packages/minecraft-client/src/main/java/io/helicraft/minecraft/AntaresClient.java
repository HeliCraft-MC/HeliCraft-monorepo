package io.helicraft.minecraft;

import com.google.gson.Gson;
import com.google.gson.JsonParseException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;

/** Asynchronous, bounded HTTP; error objects never contain credentials or response bodies. */
public final class AntaresClient implements AutoCloseable {
  private static final int MAX_RESPONSE = 65536;
  private static final int MAX_SPATIAL_RESPONSE = 16_777_216;
  private final HttpClient http;
  private final Gson gson = new Gson();
  private final URI base;
  private final String token;
  private final Duration requestTimeout;

  public AntaresClient(String url, String token) {
    this(url, token, Duration.ofSeconds(4));
  }

  public AntaresClient(String url, String token, Duration requestTimeout) {
    if (requestTimeout == null
        || requestTimeout.toMillis() < 1000
        || requestTimeout.toMillis() > 10000) {
      throw new IllegalArgumentException("Minecraft HTTP timeout must be 1000..10000 milliseconds");
    }
    this.requestTimeout = requestTimeout;
    base = URI.create(url);
    boolean local =
        java.util.Set.of("localhost", "127.0.0.1", "::1", "antares").contains(base.getHost());
    if (!("https".equals(base.getScheme()) || ("http".equals(base.getScheme()) && local))
        || base.getUserInfo() != null
        || base.getQuery() != null
        || base.getFragment() != null
        || !(base.getPath().isEmpty() || "/".equals(base.getPath()))
        || token == null
        || !token.matches("[A-Za-z0-9_-]{43,128}")) {
      throw new IllegalArgumentException(
          "Configure an HTTPS Antares origin and service credential");
    }
    this.token = token;
    http =
        HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();
  }

  public static Duration configuredTimeout() {
    try {
      return Duration.ofMillis(
          Long.parseLong(System.getenv().getOrDefault("MINECRAFT_HTTP_TIMEOUT_MS", "4000")));
    } catch (NumberFormatException error) {
      throw new IllegalArgumentException("Invalid Minecraft HTTP timeout");
    }
  }

  public Duration requestTimeout() {
    return requestTimeout;
  }

  public <T> CompletableFuture<T> post(String path, Object input, Class<T> type) {
    return send(path, input, type, MAX_RESPONSE);
  }

  public <T> CompletableFuture<T> spatialSnapshot(Object input, Class<T> type) {
    return send("/api/v1/internal/minecraft/spatial/snapshot", input, type, MAX_SPATIAL_RESPONSE);
  }

  private <T> CompletableFuture<T> send(String path, Object input, Class<T> type, int limit) {
    if (!path.matches("/api/v1/internal/minecraft/[A-Za-z0-9/-]+")) {
      throw new IllegalArgumentException("Internal Minecraft path required");
    }
    HttpRequest request =
        HttpRequest.newBuilder(base.resolve(path))
            .timeout(requestTimeout)
            .header("Authorization", "Bearer " + token)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(input)))
            .build();
    return http.sendAsync(
            request,
            HttpResponse.BodyHandlers.limiting(
                HttpResponse.BodyHandlers.ofString(java.nio.charset.StandardCharsets.UTF_8), limit))
        .thenApply(
            response -> {
              if (response.statusCode() != 200) {
                throw new ApiException(response.statusCode());
              }
              if (response.body().length() > limit) {
                throw new ApiException(502);
              }
              try {
                T parsed = gson.fromJson(response.body(), type);
                if (parsed == null) {
                  throw new ApiException(502);
                }
                return parsed;
              } catch (JsonParseException | IllegalArgumentException error) {
                throw new ApiException(502);
              }
            });
  }

  @Override
  public void close() {
    http.shutdownNow();
  }

  public static final class ApiException extends RuntimeException {
    private static final long serialVersionUID = 1L;
    private final int status;

    public ApiException(int status) {
      super("Antares request rejected (HTTP " + status + ")");
      this.status = status;
    }

    public int status() {
      return status;
    }
  }
}
