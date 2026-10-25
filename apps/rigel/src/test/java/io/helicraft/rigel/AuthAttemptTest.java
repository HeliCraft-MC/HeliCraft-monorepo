package io.helicraft.rigel;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.helicraft.minecraft.ApiModels;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

final class AuthAttemptTest {
  private static AuthAttempt attempt(UUID account) {
    return new AuthAttempt(
        new ApiModels.Challenge(
            UUID.randomUUID(),
            account,
            "Player",
            "v".repeat(43),
            "ABCDEF0123456789",
            "https://example.test/app/minecraft",
            "Example",
            Instant.now().plusSeconds(120).toString()),
        UUID.randomUUID());
  }

  private static ApiModels.Admission admission(UUID account, long seconds) {
    return new ApiModels.Admission(
        new ApiModels.Session(
            UUID.randomUUID(),
            account,
            "Player",
            Instant.now().plusSeconds(seconds).toString(),
            false),
        "deneb");
  }

  @Test
  void lookupIsNotAuthenticationAndApprovalCannotBeReplayed() {
    UUID account = UUID.randomUUID();
    AuthAttempt attempt = attempt(account);
    assertFalse(attempt.authenticated());
    assertFalse(attempt.admit(admission(UUID.randomUUID(), 30)));
    assertFalse(attempt.admit(admission(account, -1)));
    assertTrue(attempt.admit(admission(account, 30)));
    assertTrue(attempt.authenticated());
    assertFalse(attempt.admit(admission(account, 30)));
    assertTrue(attempt.close());
    assertFalse(attempt.authenticated());
    assertFalse(attempt.close());
  }

  @Test
  void lateApprovalAfterDisconnectNeverReopensAdmission() {
    UUID account = UUID.randomUUID();
    AuthAttempt attempt = attempt(account);
    assertTrue(attempt.close());
    assertFalse(attempt.admit(admission(account, 30)));
  }
}
