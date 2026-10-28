package io.helicraft.deneb;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

final class TerritoryMessagesTest {
  private static SpatialSnapshot.Jurisdiction state() {
    return new SpatialSnapshot.Jurisdiction(
        UUID.randomUUID(), Map.of("en", "Aurora", "ru", "Аврора"), UUID.randomUUID());
  }

  @Test
  void distinguishesEnteringAStateFromLeavingForWilderness() {
    var entering = new JurisdictionTracker.Transition(null, state());
    var leaving = new JurisdictionTracker.Transition(state(), null);
    assertEquals("Entering state territory", TerritoryMessages.subtitle(entering, false, false));
    assertEquals("Outside state borders", TerritoryMessages.subtitle(leaving, false, false));
    assertEquals("Независимая территория", TerritoryMessages.name(null, true));
    assertEquals("Аврора", TerritoryMessages.name(entering.current(), true));
  }

  @Test
  void labelsStaleSnapshotsInsteadOfPresentingThemAsCurrent() {
    assertEquals(
        "Last verified boundaries",
        TerritoryMessages.subtitle(new JurisdictionTracker.Transition(null, state()), true, false));
  }

  @Test
  void buildsOnlyPublicMapLinksAndHandlesMissingConfiguration() {
    assertEquals("https://example.test/map", TerritoryMessages.mapUrl("https://example.test/"));
    assertEquals("http://localhost:8096/map", TerritoryMessages.mapUrl("http://localhost:8096"));
    assertNull(TerritoryMessages.mapUrl(null));
    assertNull(TerritoryMessages.mapUrl("javascript:alert(1)"));
    assertNull(TerritoryMessages.mapUrl("https://user:secret@example.test"));
    assertNull(TerritoryMessages.mapUrl("not a URL"));
  }
}
