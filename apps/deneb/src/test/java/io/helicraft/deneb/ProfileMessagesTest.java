package io.helicraft.deneb;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.helicraft.minecraft.ApiModels;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

final class ProfileMessagesTest {
  @Test
  void showsAllCitizenshipsWithoutInventingLocationOrHardcodingServerIdentity() {
    var profile =
        new ApiModels.Profile(
            UUID.randomUUID(), "Player", "Configured name", List.of("First", "Second"), null);
    assertEquals("Citizenships: First, Second", ProfileMessages.citizenship(profile, false));
    assertEquals("Гражданство: First, Second", ProfileMessages.citizenship(profile, true));
    assertEquals("Welcome to Configured name, Player!", ProfileMessages.welcome(profile, false));
  }

  @Test
  void usesNeutralStateForNoCitizenship() {
    var profile =
        new ApiModels.Profile(UUID.randomUUID(), "Player", "Configured name", List.of(), null);
    assertEquals("No active citizenship.", ProfileMessages.citizenship(profile, false));
  }

  @Test
  void prefersTheApprovedWebsiteLanguageAndFallsBackToTheClientThenEnglish() {
    var preferred =
        new ApiModels.Profile(UUID.randomUUID(), "Player", "Configured name", List.of(), "ru");
    var unset =
        new ApiModels.Profile(UUID.randomUUID(), "Player", "Configured name", List.of(), null);
    assertEquals("ru", ProfileMessages.locale(preferred, "en"));
    assertEquals("ru", ProfileMessages.locale(unset, "ru"));
    assertEquals("en", ProfileMessages.locale(unset, "de"));
  }
}
