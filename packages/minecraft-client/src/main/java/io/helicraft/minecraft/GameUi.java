package io.helicraft.minecraft;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.event.ClickEvent;
import net.kyori.adventure.text.event.HoverEvent;
import net.kyori.adventure.text.format.TextColor;
import net.kyori.adventure.text.format.TextDecoration;

/** Shared, plain-text-safe presentation for the proxy and game plugins. */
public final class GameUi {
  public static final TextColor ACCENT = TextColor.color(0xe1a15a);
  public static final TextColor TEXT = TextColor.color(0xf2f2ef);
  public static final TextColor MUTED = TextColor.color(0xaaa9a2);
  public static final TextColor SUCCESS = TextColor.color(0x91c49c);
  public static final TextColor WARNING = TextColor.color(0xe8bd72);

  private GameUi() {}

  public static Component heading(String title) {
    return Component.text("▎ ", ACCENT)
        .append(Component.text(title, TEXT).decorate(TextDecoration.BOLD));
  }

  public static Component muted(String value) {
    return Component.text(value, MUTED);
  }

  public static Component row(String label, String value) {
    return muted(label + ": ").append(Component.text(value, TEXT));
  }

  public static Component action(String label, ClickEvent<?> action, String hint) {
    return Component.text("[ " + label + " ]", ACCENT)
        .decorate(TextDecoration.BOLD)
        .clickEvent(action)
        .hoverEvent(HoverEvent.showText(Component.text(hint, TEXT)));
  }

  public static Component command(String command, String description) {
    return action(command, ClickEvent.runCommand(command), description)
        .append(muted("  " + description));
  }

  public static Component card(Component... lines) {
    Component card = Component.empty();
    for (int index = 0; index < lines.length; index++) {
      if (index > 0) {
        card = card.append(Component.newline());
      }
      card = card.append(lines[index]);
    }
    return card;
  }

  public static Component failure(String title, String recovery) {
    return card(
        Component.text(title, WARNING).decorate(TextDecoration.BOLD),
        Component.empty(),
        Component.text(recovery, TEXT));
  }

  public static String shorten(String value, int maxCodePoints) {
    return value.codePointCount(0, value.length()) <= maxCodePoints
        ? value
        : value.substring(0, value.offsetByCodePoints(0, maxCodePoints)) + "…";
  }
}
