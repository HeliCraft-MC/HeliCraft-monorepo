package io.helicraft.minecraft;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** Minimal DTOs for the versioned Antares Minecraft contract. */
public final class ApiModels {
  private ApiModels() {}

  public record Challenge(
      UUID id,
      UUID accountId,
      String username,
      String verifier,
      String code,
      String confirmationUrl,
      String serverName,
      String expiresAt) {
    public Challenge {
      Objects.requireNonNull(id);
      Objects.requireNonNull(accountId);
      requireName(username);
      requireSecret(verifier);
      Objects.requireNonNull(code);
      Objects.requireNonNull(confirmationUrl);
      Objects.requireNonNull(serverName);
      Instant.parse(expiresAt);
    }

    @Override
    public String toString() {
      return "Challenge[redacted]";
    }
  }

  public record Proof(UUID connectionId, String verifier) {
    @Override
    public String toString() {
      return "Proof[redacted]";
    }
  }

  public record Session(
      UUID id, UUID accountId, String username, String expiresAt, boolean online) {
    public Session {
      Objects.requireNonNull(id);
      Objects.requireNonNull(accountId);
      requireName(username);
      Instant.parse(expiresAt);
    }

    public boolean valid() {
      return Instant.parse(expiresAt).isAfter(Instant.now());
    }
  }

  public record Admission(Session session, String backendId) {
    public Admission {
      Objects.requireNonNull(session);
      Objects.requireNonNull(backendId);
    }
  }

  public record ChallengeState(UUID id, String status) {
    public ChallengeState {
      Objects.requireNonNull(id);
      Objects.requireNonNull(status);
    }
  }

  public record ChallengeResult(ChallengeState challenge, Admission admission) {
    public ChallengeResult {
      Objects.requireNonNull(challenge);
    }
  }

  public record SessionResult(Admission admission) {}

  public record Profile(
      UUID accountId, String username, String serverName, List<String> states, String locale) {
    public Profile {
      Objects.requireNonNull(accountId);
      requireName(username);
      Objects.requireNonNull(serverName);
      states = List.copyOf(states);
      if (locale != null && !locale.equals("ru") && !locale.equals("en")) {
        throw new IllegalArgumentException("Unsupported profile locale");
      }
    }
  }

  public record Connect(String username, UUID connectionId) {}

  public record PaperIdentity(UUID accountId, String username) {}

  public record ProfileInput(UUID accountId, String username, String locale) {}

  public record SessionInput(UUID sessionId) {}

  public static String normalizeName(String value) {
    requireName(value);
    return value.toLowerCase(java.util.Locale.ROOT);
  }

  private static void requireName(String value) {
    if (value == null || !value.matches("[A-Za-z0-9_]{3,16}")) {
      throw new IllegalArgumentException("Invalid Minecraft name");
    }
  }

  private static void requireSecret(String value) {
    if (value == null || !value.matches("[A-Za-z0-9_-]{43}")) {
      throw new IllegalArgumentException("Invalid verifier");
    }
  }
}
