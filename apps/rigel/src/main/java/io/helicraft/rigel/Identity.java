package io.helicraft.rigel;

import java.util.UUID;

/** HeliCraft identity is distinct from the credential used to enter Minecraft. */
public record Identity(UUID id, String displayName) {
  public Identity {
    if (id == null) {
      throw new IllegalArgumentException("Identity id is required");
    }
    if (displayName == null || displayName.isBlank()) {
      throw new IllegalArgumentException("Display name is required");
    }
  }
}
