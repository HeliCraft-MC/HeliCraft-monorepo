package io.helicraft.deneb;

import io.helicraft.minecraft.ApiModels.Profile;

final class ProfileMessages {
  private ProfileMessages() {}

  static String welcome(Profile profile, boolean russian) {
    return (russian ? "Добро пожаловать на " : "Welcome to ")
        + profile.serverName()
        + ", "
        + profile.username()
        + "!";
  }

  static String citizenship(Profile profile, boolean russian) {
    if (profile.states().isEmpty()) {
      return russian ? "Нет действующего гражданства." : "No active citizenship.";
    }
    return (russian ? "Гражданство: " : "Citizenships: ") + String.join(", ", profile.states());
  }
}
