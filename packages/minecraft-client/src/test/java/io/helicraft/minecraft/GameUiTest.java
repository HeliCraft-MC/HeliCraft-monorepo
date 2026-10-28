package io.helicraft.minecraft;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.event.ClickEvent;
import net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer;
import org.junit.jupiter.api.Test;

final class GameUiTest {
  @Test
  void rendersNamesAsLiteralTextInsteadOfFormattingOrActions() {
    Component card = GameUi.card(GameUi.heading("<red>Configured name"), GameUi.row("Name", "A&B"));
    assertEquals(
        "▎ <red>Configured name\nName: A&B",
        PlainTextComponentSerializer.plainText().serialize(card));
    assertNull(card.clickEvent());
  }

  @Test
  void keepsActionsAndHintsExplicit() {
    var click = ClickEvent.openUrl("https://example.test/map");
    Component action = GameUi.action("Open map", click, "Published borders");
    assertEquals(click, action.clickEvent());
    assertEquals("[ Open map ]", PlainTextComponentSerializer.plainText().serialize(action));
  }

  @Test
  void truncatesDisplayLabelsWithoutSplittingUnicodeCharacters() {
    assertEquals("A🌍…", GameUi.shorten("A🌍B", 2));
    assertEquals("A🌍", GameUi.shorten("A🌍", 2));
  }
}
