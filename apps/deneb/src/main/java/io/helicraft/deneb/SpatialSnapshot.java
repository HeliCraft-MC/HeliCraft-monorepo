package io.helicraft.deneb;

import com.google.gson.Gson;
import io.helicraft.minecraft.SpatialModels;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.locationtech.jts.algorithm.locate.IndexedPointInAreaLocator;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Envelope;
import org.locationtech.jts.geom.Location;
import org.locationtech.jts.geom.MultiPolygon;
import org.locationtech.jts.index.strtree.STRtree;

/** Validated, immutable geometry/index pair. Publish this entire object atomically. */
final class SpatialSnapshot {
  private final UUID worldId;
  private final UUID paperWorldId;
  private final int version;
  private final String integrity;
  private final STRtree index;

  record Jurisdiction(UUID stateId, Map<String, String> names, UUID revisionId) {
    Jurisdiction {
      names = Map.copyOf(names);
    }

    String name(String locale) {
      for (String language : List.of(locale, "en", "ru")) {
        String value = names.get(language);
        if (value != null && !value.isBlank()) {
          return value;
        }
      }
      return stateId.toString();
    }
  }

  private record Entry(
      Jurisdiction jurisdiction, MultiPolygon geometry, IndexedPointInAreaLocator locator) {}

  private SpatialSnapshot(SpatialModels.Snapshot data, String integrity, STRtree index) {
    worldId = data.worldId();
    paperWorldId = data.paperWorldId();
    version = data.version();
    this.integrity = integrity;
    this.index = index;
  }

  static SpatialSnapshot build(
      SpatialModels.Envelope envelope, SpatialModels.RegisteredWorld expected) {
    byte[] bytes = envelope.payload().getBytes(StandardCharsets.UTF_8);
    if (bytes.length > SpatialModels.MAX_SNAPSHOT_BYTES
        || !digest(bytes).equals(envelope.integrity())) {
      throw new IllegalArgumentException("Spatial integrity verification failed");
    }
    SpatialModels.Snapshot data =
        new Gson().fromJson(envelope.payload(), SpatialModels.Snapshot.class);
    if (data == null
        || !expected.id().equals(data.worldId())
        || !expected.paperWorldId().equals(data.paperWorldId())
        || !expected.dimension().equals(data.dimension())
        || data.version() < expected.version()) {
      throw new IllegalArgumentException("Spatial world identity/version mismatch");
    }
    STRtree index = new STRtree();
    List<Entry> entries = new ArrayList<>();
    HashSet<UUID> states = new HashSet<>();
    for (SpatialModels.Territory territory : data.territories()) {
      if (!states.add(territory.stateId())) {
        throw new IllegalArgumentException("Duplicate state in spatial snapshot");
      }
      MultiPolygon geometry = TerritorialGeometry.parse(territory.geometry());
      Entry entry =
          new Entry(
              new Jurisdiction(territory.stateId(), territory.name(), territory.revisionId()),
              geometry,
              new IndexedPointInAreaLocator(geometry));
      entries.add(entry);
      index.insert(geometry.getEnvelopeInternal(), entry);
    }
    index.build();
    for (Entry entry : entries) {
      for (Object candidate : index.query(entry.geometry().getEnvelopeInternal())) {
        if (candidate instanceof Entry other
            && entry != other
            && entry.geometry().relate(other.geometry(), "2********")) {
          throw new IllegalArgumentException("Territorial interiors overlap");
        }
      }
    }
    return new SpatialSnapshot(data, envelope.integrity(), index);
  }

  Jurisdiction locate(double x, double z) {
    if (!Double.isFinite(x) || !Double.isFinite(z)) {
      return null;
    }
    for (Object candidate : index.query(new Envelope(x, x, z, z))) {
      if (candidate instanceof Entry entry
          && entry.locator().locate(new Coordinate(x, z)) == Location.INTERIOR) {
        return entry.jurisdiction();
      }
    }
    return null;
  }

  UUID worldId() {
    return worldId;
  }

  UUID paperWorldId() {
    return paperWorldId;
  }

  int version() {
    return version;
  }

  String integrity() {
    return integrity;
  }

  private static String digest(byte[] bytes) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    } catch (NoSuchAlgorithmException error) {
      throw new IllegalStateException("JDK SHA-256 unavailable", error);
    }
  }
}
