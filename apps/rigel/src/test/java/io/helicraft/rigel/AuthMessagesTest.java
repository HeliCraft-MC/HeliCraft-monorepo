package io.helicraft.rigel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import java.time.Instant;
import org.junit.jupiter.api.Test;

final class AuthMessagesTest {
  @Test
  void countsTheActualChallengeDeadlineAndNeverDisplaysNegativeTime() {
    Instant now = Instant.parse("2026-10-27T12:00:00Z");
    assertEquals(120, AuthMessages.remainingSeconds(now.plusSeconds(120).toString(), now));
    assertEquals(1, AuthMessages.remainingSeconds(now.plusMillis(1).toString(), now));
    assertEquals(0, AuthMessages.remainingSeconds(now.minusSeconds(60).toString(), now));
    assertEquals("2:00", AuthMessages.countdown(120));
    assertEquals("0:00", AuthMessages.countdown(-1));
  }

  @Test
  void explainsDifferentTerminalStatesWithoutExposingCodes() {
    assertNotEquals(
        AuthMessages.title(AuthMessages.End.EXPIRED, true),
        AuthMessages.title(AuthMessages.End.REJECTED, true));
    assertEquals("Confirmation expired", AuthMessages.title(AuthMessages.End.EXPIRED, false));
    assertEquals(
        "Reconnect and open the new link from your own Minecraft client.",
        AuthMessages.recovery(false));
  }
}
