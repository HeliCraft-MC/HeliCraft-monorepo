package io.helicraft.minecraft;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CompletionException;
import org.junit.jupiter.api.Test;

final class AntaresClientTest {
  @Test
  void rejectsAmbiguousNamesAndKeepsUuidIndependentOfName() {
    UUID id = UUID.randomUUID();
    assertEquals("player_1", ApiModels.normalizeName("Player_1"));
    assertThrows(IllegalArgumentException.class, () -> ApiModels.normalizeName("Рlayer"));
    assertThrows(IllegalArgumentException.class, () -> ApiModels.normalizeName("ab"));
    assertFalse(
        new ApiModels.Session(UUID.randomUUID(), id, "Player", Instant.EPOCH.toString(), true)
            .valid());
  }

  @Test
  void rejectsInsecureRemoteOriginsAndUnsafePaths() {
    assertThrows(
        IllegalArgumentException.class,
        () -> new AntaresClient("http://remote.test", "x".repeat(43)));
    assertThrows(
        IllegalArgumentException.class,
        () -> new AntaresClient("https://user:password@api.test", "x".repeat(43)));
    try (AntaresClient client = new AntaresClient("http://localhost:1", "x".repeat(43))) {
      assertThrows(
          IllegalArgumentException.class,
          () -> client.post("/api/v1/auth/login", new Object(), Object.class));
    }
  }

  @Test
  void boundsSlowBackendWithoutRetryingAdmission() throws java.io.IOException {
    HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    java.util.concurrent.atomic.AtomicInteger requests =
        new java.util.concurrent.atomic.AtomicInteger();
    server.createContext(
        "/api/v1/internal/minecraft/slow",
        exchange -> {
          requests.incrementAndGet();
        });
    server.start();
    try (AntaresClient client =
        new AntaresClient(
            "http://127.0.0.1:" + server.getAddress().getPort(),
            "x".repeat(43),
            java.time.Duration.ofSeconds(1))) {
      assertThrows(
          CompletionException.class,
          () -> client.post("/api/v1/internal/minecraft/slow", new Object(), Object.class).join());
      assertEquals(1, requests.get());
    } finally {
      server.stop(0);
    }
  }

  @Test
  void validatesRealHttpAuthenticationErrorsAndMalformedResponses() throws java.io.IOException {
    HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/api/v1/internal/minecraft/test",
        exchange -> {
          assertEquals(
              "Bearer " + "x".repeat(43), exchange.getRequestHeaders().getFirst("Authorization"));
          assertEquals(null, exchange.getRequestHeaders().getFirst("Cookie"));
          byte[] bytes = "{\"id\":null}".getBytes(StandardCharsets.UTF_8);
          exchange.sendResponseHeaders(200, bytes.length);
          exchange.getResponseBody().write(bytes);
          exchange.close();
        });
    server.createContext(
        "/api/v1/internal/minecraft/denied",
        exchange -> {
          exchange.sendResponseHeaders(403, -1);
          exchange.close();
        });
    server.start();
    try (AntaresClient client =
        new AntaresClient("http://127.0.0.1:" + server.getAddress().getPort(), "x".repeat(43))) {
      assertThrows(
          CompletionException.class,
          () ->
              client
                  .post("/api/v1/internal/minecraft/test", new Object(), ApiModels.Challenge.class)
                  .join());
      CompletionException error =
          assertThrows(
              CompletionException.class,
              () ->
                  client
                      .post("/api/v1/internal/minecraft/denied", new Object(), Object.class)
                      .join());
      assertEquals("Antares request rejected (HTTP 403)", error.getCause().getMessage());
    } finally {
      server.stop(0);
    }
  }
}
