package io.helicraft.deneb;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.google.gson.Gson;
import io.helicraft.minecraft.SpatialModels;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

final class SpatialSnapshotTest {
  private static final Gson JSON = new Gson();
  private static final UUID WORLD = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final UUID PAPER = UUID.fromString("00000000-0000-4000-8000-000000000002");
  private static final UUID STATE = UUID.fromString("00000000-0000-4000-8000-000000000003");
  private static final SpatialModels.RegisteredWorld EXPECTED =
      new SpatialModels.RegisteredWorld(WORLD, PAPER, "minecraft:overworld", 1);

  record Point(double x, double z, boolean inside) {}

  record Fixture(String name, SpatialModels.Geometry geometry, List<Point> points) {}

  static Stream<Fixture> fixtures() throws IOException {
    String data = Files.readString(Path.of(System.getProperty("helicraft.spatial.fixtures")));
    return Stream.of(JSON.fromJson(data, Fixture[].class));
  }

  @ParameterizedTest(name = "{0}")
  @MethodSource("fixtures")
  void matchesTheSharedPostgisFixtures(Fixture fixture) {
    SpatialSnapshot snapshot =
        SpatialSnapshot.build(envelope(List.of(territory(fixture.geometry(), STATE))), EXPECTED);
    for (Point point : fixture.points()) {
      assertEquals(
          point.inside(),
          snapshot.locate(point.x(), point.z()) != null,
          fixture.name() + " at X=" + point.x() + " Z=" + point.z());
    }
  }

  @Test
  void validatesWorldIntegrityDuplicateStatesAndLanguageFallback() {
    SpatialModels.Geometry shape = rectangle(0, 0, 32, 32);
    SpatialModels.Envelope valid = envelope(List.of(territory(shape, STATE)));
    SpatialSnapshot snapshot = SpatialSnapshot.build(valid, EXPECTED);
    SpatialSnapshot.Jurisdiction jurisdiction = snapshot.locate(16, 16);
    assertNotNull(jurisdiction);
    assertEquals("Аврора", jurisdiction.name("ru"));
    assertEquals("Aurora", jurisdiction.name("fr"));
    assertNull(snapshot.locate(32, 16));
    assertThrows(
        IllegalArgumentException.class,
        () ->
            SpatialSnapshot.build(
                valid,
                new SpatialModels.RegisteredWorld(
                    WORLD, UUID.randomUUID(), "minecraft:overworld", 1)));
    assertThrows(
        IllegalArgumentException.class,
        () ->
            SpatialSnapshot.build(
                valid, new SpatialModels.RegisteredWorld(WORLD, PAPER, "minecraft:overworld", 2)));
    assertThrows(
        IllegalArgumentException.class,
        () ->
            SpatialSnapshot.build(
                new SpatialModels.Envelope(
                    valid.integrity(),
                    valid.payload().replace("Aurora", "Loria"),
                    valid.generatedAt()),
                EXPECTED));
    assertThrows(
        IllegalArgumentException.class,
        () ->
            SpatialSnapshot.build(
                envelope(List.of(territory(shape, STATE), territory(shape, STATE))), EXPECTED));
  }

  @Test
  void permitsSharedEdgesAndRejectsInteriorOverlapAcrossStates() {
    UUID other = UUID.randomUUID();
    SpatialSnapshot adjacent =
        SpatialSnapshot.build(
            envelope(
                List.of(
                    territory(rectangle(0, 0, 32, 32), STATE),
                    territory(rectangle(32, 0, 64, 32), other))),
            EXPECTED);
    assertNull(adjacent.locate(32, 16));
    assertEquals(STATE, adjacent.locate(31, 16).stateId());
    assertEquals(other, adjacent.locate(33, 16).stateId());
    assertThrows(
        IllegalArgumentException.class,
        () ->
            SpatialSnapshot.build(
                envelope(
                    List.of(
                        territory(rectangle(0, 0, 32, 32), STATE),
                        territory(rectangle(31, 0, 64, 32), other))),
                EXPECTED));
  }

  @Test
  void resolvesAnIndependentStateInsideTheSharedEnclaveFixture() throws IOException {
    Fixture outer =
        fixtures()
            .filter(fixture -> fixture.name().equals("polygon with an independent enclave"))
            .findFirst()
            .orElseThrow();
    UUID enclave = UUID.randomUUID();
    SpatialSnapshot snapshot =
        SpatialSnapshot.build(
            envelope(
                List.of(
                    territory(outer.geometry(), STATE),
                    territory(rectangle(16, 16, 32, 32), enclave))),
            EXPECTED);
    assertEquals(STATE, snapshot.locate(8, 24).stateId());
    assertEquals(enclave, snapshot.locate(24, 24).stateId());
    assertNull(snapshot.locate(16, 24));
    assertNull(snapshot.locate(32, 24));
  }

  @Test
  void refusesInvalidGeometryInsteadOfRepairingItOrFillingHoles() {
    SpatialModels.Geometry bowtie =
        JSON.fromJson(
            """
        {"type":"Polygon","coordinates":[[[0,0],[32,32],[0,32],[32,0],[0,0]]]}
        """,
            SpatialModels.Geometry.class);
    assertThrows(IllegalArgumentException.class, () -> TerritorialGeometry.parse(bowtie));
    SpatialModels.Geometry open =
        JSON.fromJson(
            """
        {"type":"Polygon","coordinates":[[[0,0],[32,0],[32,32],[0,32]]]}
        """,
            SpatialModels.Geometry.class);
    assertThrows(IllegalArgumentException.class, () -> TerritorialGeometry.parse(open));
  }

  private static SpatialModels.Geometry rectangle(int minX, int minZ, int maxX, int maxZ) {
    String data =
        "{\"type\":\"Polygon\",\"coordinates\":[[["
            + minX
            + ","
            + minZ
            + "],["
            + maxX
            + ","
            + minZ
            + "],["
            + maxX
            + ","
            + maxZ
            + "],["
            + minX
            + ","
            + maxZ
            + "],["
            + minX
            + ","
            + minZ
            + "]]]}";
    return JSON.fromJson(data, SpatialModels.Geometry.class);
  }

  private static SpatialModels.Territory territory(SpatialModels.Geometry geometry, UUID state) {
    return new SpatialModels.Territory(
        state,
        Map.of("en", "Aurora", "ru", "Аврора"),
        UUID.randomUUID(),
        1,
        TerritorialGeometry.parse(geometry).getArea(),
        geometry);
  }

  private static SpatialModels.Envelope envelope(List<SpatialModels.Territory> territories) {
    String payload =
        JSON.toJson(
            new SpatialModels.Snapshot(1, WORLD, PAPER, "minecraft:overworld", 1, territories));
    try {
      String integrity =
          HexFormat.of()
              .formatHex(
                  MessageDigest.getInstance("SHA-256")
                      .digest(payload.getBytes(StandardCharsets.UTF_8)));
      return new SpatialModels.Envelope(integrity, payload, Instant.now().toString());
    } catch (NoSuchAlgorithmException error) {
      throw new IllegalStateException(error);
    }
  }
}
