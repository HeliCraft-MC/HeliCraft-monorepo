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
            UUID.randomUUID(), "Player", "Configured name", List.of("First", "Second"));
    assertEquals("Citizenships: First, Second", ProfileMessages.citizenship(profile, false));
    assertEquals("Гражданство: First, Second", ProfileMessages.citizenship(profile, true));
    assertEquals("Welcome to Configured name, Player!", ProfileMessages.welcome(profile, false));
  }

  @Test
  void usesNeutralStateForNoCitizenship() {
    var profile = new ApiModels.Profile(UUID.randomUUID(), "Player", "Configured name", List.of());
    assertEquals("No active citizenship.", ProfileMessages.citizenship(profile, false));
  }
}
