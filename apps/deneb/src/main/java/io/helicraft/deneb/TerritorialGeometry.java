package io.helicraft.deneb;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import io.helicraft.minecraft.SpatialModels;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.LinearRing;
import org.locationtech.jts.geom.MultiPolygon;
import org.locationtech.jts.geom.Polygon;
import org.locationtech.jts.operation.valid.IsValidOp;

/** Strict local X/Z parsing. No repair, geodetic transformation or boundary tolerance. */
final class TerritorialGeometry {
  private static final GeometryFactory FACTORY = new GeometryFactory();

  private TerritorialGeometry() {}

  static MultiPolygon parse(SpatialModels.Geometry input) {
    JsonArray components = new JsonArray();
    if ("Polygon".equals(input.type())) {
      components.add(input.coordinates());
    } else {
      components = input.coordinates();
    }
    if (components.isEmpty() || components.size() > SpatialModels.MAX_COMPONENTS) {
      throw new IllegalArgumentException("Territorial component limit");
    }
    int[] totals = {0, 0};
    Polygon[] polygons = new Polygon[components.size()];
    for (int i = 0; i < polygons.length; i++) {
      polygons[i] = polygon(array(components.get(i)), totals);
    }
    MultiPolygon result = FACTORY.createMultiPolygon(polygons);
    if (!new IsValidOp(result).isValid()
        || result.isEmpty()
        || result.getArea() <= 0
        || result.getArea() > SpatialModels.MAX_AREA) {
      throw new IllegalArgumentException("Invalid territorial topology or area");
    }
    return result;
  }

  private static Polygon polygon(JsonArray input, int[] totals) {
    totals[1] += input.size();
    if (input.isEmpty() || totals[1] > SpatialModels.MAX_RINGS) {
      throw new IllegalArgumentException("Territorial ring limit");
    }
    LinearRing shell = ring(array(input.get(0)), totals);
    LinearRing[] holes = new LinearRing[input.size() - 1];
    for (int i = 0; i < holes.length; i++) {
      holes[i] = ring(array(input.get(i + 1)), totals);
    }
    return FACTORY.createPolygon(shell, holes);
  }

  private static LinearRing ring(JsonArray input, int[] totals) {
    totals[0] += input.size();
    if (input.size() < 4 || totals[0] > SpatialModels.MAX_VERTICES) {
      throw new IllegalArgumentException("Territorial vertex limit");
    }
    Coordinate[] points = new Coordinate[input.size()];
    for (int i = 0; i < points.length; i++) {
      JsonArray point = array(input.get(i));
      if (point.size() != 2) {
        throw new IllegalArgumentException("Exactly X/Z coordinates required");
      }
      points[i] = new Coordinate(coordinate(point.get(0)), coordinate(point.get(1)));
    }
    if (!points[0].equals2D(points[points.length - 1])) {
      throw new IllegalArgumentException("Territorial rings must be closed");
    }
    return FACTORY.createLinearRing(points);
  }

  private static JsonArray array(JsonElement input) {
    if (!input.isJsonArray()) {
      throw new IllegalArgumentException("Territorial coordinate array required");
    }
    return input.getAsJsonArray();
  }

  private static double coordinate(JsonElement input) {
    if (!input.isJsonPrimitive() || !input.getAsJsonPrimitive().isNumber()) {
      throw new IllegalArgumentException("Numeric Minecraft coordinate required");
    }
    double value = input.getAsDouble();
    if (!Double.isFinite(value) || Math.abs(value) > SpatialModels.MAX_COORDINATE) {
      throw new IllegalArgumentException("Minecraft coordinate outside bounds");
    }
    return value;
  }
}
