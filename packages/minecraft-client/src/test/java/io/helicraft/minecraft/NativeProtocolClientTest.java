package io.helicraft.minecraft;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.event.ClickEvent;
import org.geysermc.mcprotocollib.protocol.data.game.entity.player.PlayerAction;
import org.junit.jupiter.api.Test;

final class NativeProtocolClientTest {
  @Test
  void observesTheSameCodeLineAcrossStyledAdventureChildrenAsThePlayer() {
    Component card =
        GameUi.card(
            GameUi.heading("Confirm your sign-in"), GameUi.row("Code / Код", "0123456789ABCDEF"));
    assertEquals(
        "▎ Confirm your sign-in\nCode / Код: 0123456789ABCDEF",
        NativeProtocolClient.visibleText(card));
  }

  @Test
  void keepsClickPayloadsOutOfVisibleTextEvidence() {
    Component link =
        GameUi.action(
            "Open website",
            ClickEvent.openUrl("https://example.test/app/minecraft#code=0123456789ABCDEF"),
            "Confirm your sign-in");
    assertEquals("[ Open website ]", NativeProtocolClient.visibleText(link));
    assertFalse(NativeProtocolClient.visibleText(link).contains("0123456789ABCDEF"));
  }

  @Test
  void sendsANativeBlockBreakAtExactCoordinates() {
    var packet = NativeProtocolClient.breakBlock("9 300 9");
    assertEquals(PlayerAction.START_DIGGING, packet.getAction());
    assertEquals(9, packet.getPosition().getX());
    assertEquals(300, packet.getPosition().getY());
    assertEquals(9, packet.getPosition().getZ());
    assertThrows(IllegalArgumentException.class, () -> NativeProtocolClient.breakBlock("9 300"));
    assertThrows(NumberFormatException.class, () -> NativeProtocolClient.breakBlock("9 300.5 9"));
  }
}
