package io.helicraft.deneb;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

final class WorldGeometryTest {
  @Test
  void measuresMinecraftPlaneDistance() {
    var geometry = new WorldGeometry();
    assertEquals(5.0, geometry.distance(3, 4));
    assertEquals(0.0, geometry.distance(0, 0));
  }
}
