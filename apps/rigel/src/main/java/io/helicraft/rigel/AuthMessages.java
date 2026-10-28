package io.helicraft.rigel;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

final class AuthMessages {
  enum End {
    UNAVAILABLE,
    EXPIRED,
    REJECTED,
    CLOSED
  }

  private AuthMessages() {}

  static long remainingSeconds(String expiresAt, Instant now) {
    long millis = Duration.between(now, Instant.parse(expiresAt)).toMillis();
    return Math.max(0, (millis + 999) / 1000);
  }

  static String countdown(long seconds) {
    long bounded = Math.max(0, seconds);
    return String.format(Locale.ROOT, "%d:%02d", bounded / 60, bounded % 60);
  }

  static String title(End reason, boolean russian) {
    return switch (reason) {
      case EXPIRED -> russian ? "Время подтверждения истекло" : "Confirmation expired";
      case REJECTED -> russian ? "Вход отклонён на сайте" : "Sign-in rejected on the website";
      case CLOSED -> russian ? "Запрос входа закрыт" : "Sign-in request closed";
      case UNAVAILABLE -> russian ? "Не удалось завершить вход" : "Could not complete sign-in";
    };
  }

  static String recovery(boolean russian) {
    return russian
        ? "Подключитесь снова и откройте новую ссылку из своего Minecraft."
        : "Reconnect and open the new link from your own Minecraft client.";
  }
}
