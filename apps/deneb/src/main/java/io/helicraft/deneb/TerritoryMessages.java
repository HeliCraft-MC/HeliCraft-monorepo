package io.helicraft.deneb;

import java.net.URI;

final class TerritoryMessages {
  private TerritoryMessages() {}

  static String name(SpatialSnapshot.Jurisdiction jurisdiction, boolean russian) {
    return jurisdiction == null
        ? (russian ? "Независимая территория" : "Wilderness")
        : jurisdiction.name(russian ? "ru" : "en");
  }

  static String subtitle(
      JurisdictionTracker.Transition transition, boolean stale, boolean russian) {
    if (stale) {
      return russian ? "Последние подтверждённые границы" : "Last verified boundaries";
    }
    if (transition.current() == null) {
      return russian ? "За пределами государственных границ" : "Outside state borders";
    }
    return transition.previous() == null
        ? (russian ? "Вы входите в государство" : "Entering state territory")
        : (russian ? "Вы покидаете " : "Leaving ") + name(transition.previous(), russian);
  }

  static String mapUrl(String origin) {
    if (origin == null || origin.isBlank()) {
      return null;
    }
    try {
      URI uri = URI.create(origin);
      if ((!"https".equals(uri.getScheme()) && !"http".equals(uri.getScheme()))
          || uri.getHost() == null
          || uri.getUserInfo() != null) {
        return null;
      }
      return uri.resolve("/map").toString();
    } catch (IllegalArgumentException error) {
      return null;
    }
  }
}
