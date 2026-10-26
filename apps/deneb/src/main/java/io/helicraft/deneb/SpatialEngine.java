package io.helicraft.deneb;

import io.helicraft.minecraft.AntaresClient;
import io.helicraft.minecraft.SpatialModels;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;
import java.util.function.LongSupplier;

/**
 * Asynchronous reconciliation owns immutable snapshots; movement only reads the local reference.
 */
final class SpatialEngine implements AutoCloseable {
  private static final long STALE_AFTER_NANOS = TimeUnit.SECONDS.toNanos(30);
  private final AntaresClient api;
  private final Consumer<String> diagnostics;
  private final LongSupplier clock;
  private final ExecutorService builder = Executors.newSingleThreadExecutor();
  private final AtomicReference<Map<UUID, Verified>> cache = new AtomicReference<>(Map.of());
  private final AtomicBoolean busy = new AtomicBoolean();
  private final AtomicBoolean failed = new AtomicBoolean();
  private volatile boolean stopped;

  private record Verified(SpatialSnapshot snapshot, long checkedAt) {}

  record View(SpatialSnapshot snapshot, boolean stale) {}

  SpatialEngine(AntaresClient api, Consumer<String> diagnostics) {
    this(api, diagnostics, System::nanoTime);
  }

  SpatialEngine(AntaresClient api, Consumer<String> diagnostics, LongSupplier clock) {
    this.api = api;
    this.diagnostics = diagnostics;
    this.clock = clock;
  }

  View view(UUID paperWorldId) {
    Verified verified = cache.get().get(paperWorldId);
    return verified == null
        ? null
        : new View(
            verified.snapshot(), clock.getAsLong() - verified.checkedAt() > STALE_AFTER_NANOS);
  }

  void refresh(List<SpatialModels.WorldIdentity> identities) {
    if (stopped || !busy.compareAndSet(false, true)) {
      return;
    }
    List<SpatialModels.WorldIdentity> loaded = List.copyOf(identities);
    api.post(
            "/api/v1/internal/minecraft/spatial/worlds",
            new SpatialModels.WorldRequest(loaded),
            SpatialModels.WorldResponse.class)
        .thenCompose(worlds -> reconcile(loaded, worlds))
        .whenComplete(
            (ignored, error) -> {
              busy.set(false);
              if (stopped) {
                return;
              }
              if (error != null) {
                if (failed.compareAndSet(false, true)) {
                  diagnostics.accept(
                      "Spatial reconciliation unavailable; retaining last verified snapshot");
                }
              } else if (failed.compareAndSet(true, false)) {
                diagnostics.accept("Spatial reconciliation recovered");
              }
            });
  }

  private CompletableFuture<Void> reconcile(
      List<SpatialModels.WorldIdentity> loaded, SpatialModels.WorldResponse response) {
    if (stopped) {
      return CompletableFuture.completedFuture(null);
    }
    HashMap<UUID, SpatialModels.RegisteredWorld> allowed = new HashMap<>();
    HashSet<UUID> logical = new HashSet<>();
    for (SpatialModels.RegisteredWorld world : response.items()) {
      boolean matches =
          loaded.stream()
              .anyMatch(
                  identity ->
                      identity.paperWorldId().equals(world.paperWorldId())
                          && identity.dimension().equals(world.dimension()));
      if (!matches
          || allowed.put(world.paperWorldId(), world) != null
          || !logical.add(world.id())) {
        throw new IllegalArgumentException("Unexpected or duplicate registered world identity");
      }
    }
    cache.updateAndGet(
        current -> {
          HashMap<UUID, Verified> retained = new HashMap<>();
          current.forEach(
              (id, verified) -> {
                SpatialModels.RegisteredWorld world = allowed.get(id);
                if (world != null && world.id().equals(verified.snapshot().worldId())) {
                  retained.put(id, verified);
                }
              });
          return Map.copyOf(retained);
        });
    List<CompletableFuture<Void>> requests =
        response.items().stream().map(this::reconcileWorld).toList();
    return CompletableFuture.allOf(requests.toArray(new CompletableFuture<?>[0]));
  }

  private CompletableFuture<Void> reconcileWorld(SpatialModels.RegisteredWorld world) {
    var request = new SpatialModels.SnapshotRequest(world.id(), world.paperWorldId());
    return api.post(
            "/api/v1/internal/minecraft/spatial/version", request, SpatialModels.Version.class)
        .thenCompose(
            version -> {
              if (!version.worldId().equals(world.id())
                  || !version.paperWorldId().equals(world.paperWorldId())) {
                throw new IllegalArgumentException("Spatial version has another world identity");
              }
              Verified current = cache.get().get(world.paperWorldId());
              if (current != null && version.version() < current.snapshot().version()) {
                throw new IllegalArgumentException("Spatial version regression");
              }
              if (current != null
                  && current.snapshot().version() == version.version()
                  && current.snapshot().integrity().equals(version.integrity())) {
                install(current.snapshot());
                return CompletableFuture.completedFuture(null);
              }
              var expected =
                  new SpatialModels.RegisteredWorld(
                      world.id(), world.paperWorldId(), world.dimension(), version.version());
              return api.spatialSnapshot(request, SpatialModels.Envelope.class)
                  .thenAcceptAsync(
                      envelope -> {
                        SpatialSnapshot snapshot = SpatialSnapshot.build(envelope, expected);
                        install(snapshot);
                        if (!stopped) {
                          diagnostics.accept(
                              "Spatial snapshot installed world "
                                  + snapshot.worldId()
                                  + " revision "
                                  + snapshot.version());
                        }
                      },
                      builder);
            });
  }

  private void install(SpatialSnapshot snapshot) {
    if (stopped) {
      return;
    }
    cache.updateAndGet(
        current -> {
          Verified previous = current.get(snapshot.paperWorldId());
          if (stopped) {
            return current;
          }
          if (previous != null && previous.snapshot().version() > snapshot.version()) {
            return current;
          }
          HashMap<UUID, Verified> updated = new HashMap<>(current);
          updated.put(snapshot.paperWorldId(), new Verified(snapshot, clock.getAsLong()));
          return Map.copyOf(updated);
        });
  }

  @Override
  public void close() {
    stopped = true;
    builder.shutdownNow();
    cache.set(Map.of());
  }
}
