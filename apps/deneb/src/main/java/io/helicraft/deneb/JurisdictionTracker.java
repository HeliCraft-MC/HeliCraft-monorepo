package io.helicraft.deneb;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/** Main-thread stable dwell time suppresses repeated announcements at a shared boundary. */
final class JurisdictionTracker {
  private static final long DWELL_NANOS = TimeUnit.MILLISECONDS.toNanos(500);
  private final Map<UUID, Presence> players = new HashMap<>();

  record Transition(SpatialSnapshot.Jurisdiction previous, SpatialSnapshot.Jurisdiction current) {}

  private static final class Presence {
    SpatialSnapshot.Jurisdiction current;
    SpatialSnapshot.Jurisdiction candidate;
    UUID candidateWorld;
    long candidateSince;
    boolean initialized;
  }

  Transition observe(UUID player, UUID world, SpatialSnapshot.Jurisdiction jurisdiction, long now) {
    Presence presence = players.computeIfAbsent(player, ignored -> new Presence());
    if (!Objects.equals(state(presence.candidate), state(jurisdiction))
        || !world.equals(presence.candidateWorld)) {
      presence.candidate = jurisdiction;
      presence.candidateWorld = world;
      presence.candidateSince = now;
      return null;
    }
    if (now - presence.candidateSince < DWELL_NANOS) {
      return null;
    }
    SpatialSnapshot.Jurisdiction previous = presence.current;
    boolean changed = !Objects.equals(state(previous), state(jurisdiction));
    presence.current = jurisdiction;
    if (!presence.initialized) {
      presence.initialized = true;
      if (jurisdiction == null) {
        return null;
      }
    }
    return changed ? new Transition(previous, jurisdiction) : null;
  }

  void unknown(UUID player) {
    Presence presence = players.get(player);
    if (presence != null) {
      presence.candidateWorld = null;
    }
  }

  void remove(UUID player) {
    players.remove(player);
  }

  private static UUID state(SpatialSnapshot.Jurisdiction jurisdiction) {
    return jurisdiction == null ? null : jurisdiction.stateId();
  }
}
