package io.helicraft.minecraft;

import com.google.gson.JsonArray;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/** Bounded version-one world identity and territorial snapshot DTOs; no political authority. */
public final class SpatialModels {
  public static final int MAX_SNAPSHOT_BYTES = 8_388_608;
  public static final int MAX_VERTICES = 4096;
  public static final int MAX_RINGS = 256;
  public static final int MAX_COMPONENTS = 32;
  public static final int MAX_TERRITORIES = 1000;
  public static final double MAX_COORDINATE = 29_999_984;
  public static final double MAX_AREA = 1_000_000_000;

  private SpatialModels() {}

  public record WorldIdentity(UUID paperWorldId, String dimension) {
    public WorldIdentity {
      Objects.requireNonNull(paperWorldId);
      Objects.requireNonNull(dimension);
    }
  }

  public record WorldRequest(List<WorldIdentity> worlds, boolean registerOverworld) {
    public WorldRequest {
      worlds = List.copyOf(worlds);
    }
  }

  public record RegisteredWorld(UUID id, UUID paperWorldId, String dimension, int version) {
    public RegisteredWorld {
      Objects.requireNonNull(id);
      Objects.requireNonNull(paperWorldId);
      Objects.requireNonNull(dimension);
      if (version < 0) {
        throw new IllegalArgumentException("Invalid spatial version");
      }
    }
  }

  public record WorldResponse(List<RegisteredWorld> items) {
    public WorldResponse {
      items = List.copyOf(items);
    }
  }

  public record SnapshotRequest(UUID worldId, UUID paperWorldId) {}

  public record Version(UUID worldId, UUID paperWorldId, int version, String integrity) {
    public Version {
      Objects.requireNonNull(worldId);
      Objects.requireNonNull(paperWorldId);
      requireIntegrity(integrity);
      if (version < 0) {
        throw new IllegalArgumentException("Invalid spatial version");
      }
    }
  }

  public record Envelope(String integrity, String payload, String generatedAt) {
    public Envelope {
      requireIntegrity(integrity);
      Objects.requireNonNull(payload);
      Instant.parse(generatedAt);
      if (payload.isBlank() || payload.length() > MAX_SNAPSHOT_BYTES) {
        throw new IllegalArgumentException("Spatial payload outside bounds");
      }
    }
  }

  public record Geometry(String type, JsonArray coordinates) {
    public Geometry {
      if (!("Polygon".equals(type) || "MultiPolygon".equals(type))) {
        throw new IllegalArgumentException("Territory must be polygonal");
      }
      Objects.requireNonNull(coordinates);
    }
  }

  public record Territory(
      UUID stateId,
      Map<String, String> name,
      UUID revisionId,
      int number,
      double area,
      Geometry geometry) {
    public Territory {
      Objects.requireNonNull(stateId);
      Objects.requireNonNull(revisionId);
      Objects.requireNonNull(geometry);
      name = Map.copyOf(name);
      if (number <= 0 || !Double.isFinite(area) || area <= 0 || area > MAX_AREA) {
        throw new IllegalArgumentException("Invalid territorial revision");
      }
    }
  }

  public record Snapshot(
      int schemaVersion,
      UUID worldId,
      UUID paperWorldId,
      String dimension,
      int version,
      List<Territory> territories) {
    public Snapshot {
      Objects.requireNonNull(worldId);
      Objects.requireNonNull(paperWorldId);
      Objects.requireNonNull(dimension);
      territories = List.copyOf(territories);
      if (schemaVersion != 1
          || version < 0
          || territories.size() > MAX_TERRITORIES
          || (!"minecraft:overworld".equals(dimension) && !territories.isEmpty())) {
        throw new IllegalArgumentException("Unsupported spatial snapshot");
      }
    }
  }

  private static void requireIntegrity(String integrity) {
    if (integrity == null || !integrity.matches("[a-f0-9]{64}")) {
      throw new IllegalArgumentException("Invalid spatial integrity metadata");
    }
  }
}
