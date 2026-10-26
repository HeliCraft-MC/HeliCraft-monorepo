package io.helicraft.minecraft;

import com.google.gson.Gson;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.serializer.gson.GsonComponentSerializer;
import org.geysermc.mcprotocollib.network.Session;
import org.geysermc.mcprotocollib.network.event.session.DisconnectedEvent;
import org.geysermc.mcprotocollib.network.event.session.PacketErrorEvent;
import org.geysermc.mcprotocollib.network.event.session.SessionAdapter;
import org.geysermc.mcprotocollib.network.factory.ClientNetworkSessionFactory;
import org.geysermc.mcprotocollib.network.packet.Packet;
import org.geysermc.mcprotocollib.protocol.MinecraftConstants;
import org.geysermc.mcprotocollib.protocol.MinecraftProtocol;
import org.geysermc.mcprotocollib.protocol.packet.configuration.clientbound.ClientboundCodeOfConductPacket;
import org.geysermc.mcprotocollib.protocol.packet.configuration.serverbound.ServerboundAcceptCodeOfConductPacket;
import org.geysermc.mcprotocollib.protocol.packet.ingame.clientbound.ClientboundLoginPacket;
import org.geysermc.mcprotocollib.protocol.packet.ingame.clientbound.ClientboundSystemChatPacket;
import org.geysermc.mcprotocollib.protocol.packet.ingame.clientbound.entity.player.ClientboundPlayerPositionPacket;
import org.geysermc.mcprotocollib.protocol.packet.ingame.clientbound.title.ClientboundSetSubtitleTextPacket;
import org.geysermc.mcprotocollib.protocol.packet.ingame.clientbound.title.ClientboundSetTitleTextPacket;
import org.geysermc.mcprotocollib.protocol.packet.ingame.serverbound.ServerboundChatCommandPacket;
import org.geysermc.mcprotocollib.protocol.packet.ingame.serverbound.ServerboundClientTickEndPacket;
import org.geysermc.mcprotocollib.protocol.packet.ingame.serverbound.ServerboundPlayerLoadedPacket;
import org.geysermc.mcprotocollib.protocol.packet.ingame.serverbound.level.ServerboundAcceptTeleportationPacket;
import org.geysermc.mcprotocollib.protocol.packet.ingame.serverbound.player.ServerboundMovePlayerPosPacket;
import org.geysermc.mcprotocollib.protocol.packet.login.clientbound.ClientboundCustomQueryPacket;
import org.geysermc.mcprotocollib.protocol.packet.login.clientbound.ClientboundLoginFinishedPacket;
import org.geysermc.mcprotocollib.protocol.packet.login.serverbound.ServerboundCustomQueryAnswerPacket;

/** Test-only IPC adapter around the maintained native 26.3 codec, never bundled in plugins. */
public final class NativeProtocolClient {
  private static final Gson JSON = new Gson();

  private NativeProtocolClient() {}

  private static synchronized void emit(String type, String value) {
    // Stdout is a private IPC pipe consumed in memory by the test runner, not a server log.
    System.out.println(JSON.toJson(Map.of("type", type, "value", value)));
    System.out.flush();
  }

  private static void message(String type, Component value) {
    emit(type, GsonComponentSerializer.gson().serialize(value));
  }

  public static void main(String[] args) throws Exception {
    if (args.length < 2 || !args[0].matches("[A-Za-z0-9_]{3,16}")) {
      throw new IllegalArgumentException("Expected test username, loopback port and optional host");
    }
    var protocol = new MinecraftProtocol(args[0]);
    if (!"26.3".equals(protocol.getCodec().getMinecraftVersion())
        || protocol.getCodec().getProtocolVersion() != 777) {
      throw new IllegalStateException("Native Minecraft 26.3 codec required");
    }
    var session =
        ClientNetworkSessionFactory.factory()
            .setAddress("127.0.0.1", Integer.parseInt(args[1]))
            .setProtocol(protocol)
            .create();
    session.setFlag(MinecraftConstants.FOLLOW_TRANSFERS, false);
    if (args.length > 2) {
      session.setFlag(MinecraftConstants.CLIENT_HOST, args[2]);
    }
    session.addListener(new EvidenceListener());
    session.connect(false);
    try (var input = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8))) {
      String line;
      while ((line = input.readLine()) != null) {
        if (line.startsWith("COMMAND ")) {
          session.send(new ServerboundChatCommandPacket(line.substring("COMMAND ".length())));
        } else if (line.startsWith("MOVE ")) {
          String[] position = line.substring("MOVE ".length()).split(" ");
          session.send(
              new ServerboundMovePlayerPosPacket(
                  true,
                  false,
                  Double.parseDouble(position[0]),
                  Double.parseDouble(position[1]),
                  Double.parseDouble(position[2])));
          session.send(ServerboundClientTickEndPacket.INSTANCE);
        } else if ("END".equals(line)) {
          break;
        }
      }
    } finally {
      session.disconnect(Component.text("Disposable test client closed"));
    }
  }

  private static final class EvidenceListener extends SessionAdapter {
    @Override
    public void packetReceived(Session session, Packet packet) {
      emit("packet", packet.getClass().getSimpleName());
      if (packet instanceof ClientboundCustomQueryPacket query) {
        session.send(new ServerboundCustomQueryAnswerPacket(query.getMessageId(), null));
      } else if (packet instanceof ClientboundLoginFinishedPacket login) {
        emit("identity", login.getProfile().getId().toString());
      } else if (packet instanceof ClientboundSystemChatPacket chat) {
        message("message", chat.getContent());
      } else if (packet instanceof ClientboundSetTitleTextPacket title) {
        message("title", title.getText());
      } else if (packet instanceof ClientboundSetSubtitleTextPacket subtitle) {
        message("subtitle", subtitle.getText());
      } else if (packet instanceof ClientboundCodeOfConductPacket) {
        session.send(ServerboundAcceptCodeOfConductPacket.INSTANCE);
      } else if (packet instanceof ClientboundPlayerPositionPacket position) {
        session.send(
            new ServerboundAcceptTeleportationPacket(
                position.getId(),
                position.getPosition().getX(),
                position.getPosition().getY(),
                position.getPosition().getZ(),
                position.getYRot(),
                position.getXRot()));
        session.send(ServerboundPlayerLoadedPacket.INSTANCE);
        session.send(ServerboundClientTickEndPacket.INSTANCE);
        emit("position", JSON.toJson(position.getPosition()));
      } else if (packet instanceof ClientboundLoginPacket) {
        emit("game", "joined");
      }
    }

    @Override
    public void packetError(PacketErrorEvent event) {
      emit("error", event.getCause().getClass().getSimpleName());
    }

    @Override
    public void disconnected(DisconnectedEvent event) {
      message("disconnected", event.getReason());
      if (event.getCause() != null) {
        emit("error", event.getCause().getClass().getSimpleName());
      }
    }
  }
}
