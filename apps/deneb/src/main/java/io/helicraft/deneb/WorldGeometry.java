package io.helicraft.deneb;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;

/** A small, framework-independent spatial primitive for future world rules. */
public final class WorldGeometry {
  private final GeometryFactory factory = new GeometryFactory();
  private final Cache<String, Point> points =
      Caffeine.newBuilder().maximumSize(1000).expireAfterAccess(Duration.ofMinutes(5)).build();

  public double distance(double x, double z) {
    Point origin = points.get("origin", key -> factory.createPoint(new Coordinate(0, 0)));
    return origin.distance(factory.createPoint(new Coordinate(x, z)));
  }
}
