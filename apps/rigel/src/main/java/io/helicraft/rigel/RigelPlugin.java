package io.helicraft.rigel;

import com.google.inject.Inject;
import com.velocitypowered.api.event.EventTask;
import com.velocitypowered.api.event.ResultedEvent.ComponentResult;
import com.velocitypowered.api.event.Subscribe;
import com.velocitypowered.api.event.connection.DisconnectEvent;
import com.velocitypowered.api.event.connection.LoginEvent;
import com.velocitypowered.api.event.connection.PreLoginEvent;
import com.velocitypowered.api.event.player.GameProfileRequestEvent;
import com.velocitypowered.api.event.player.ServerPreConnectEvent;
import com.velocitypowered.api.event.proxy.ProxyInitializeEvent;
import com.velocitypowered.api.event.proxy.ProxyShutdownEvent;
import com.velocitypowered.api.plugin.Dependency;
import com.velocitypowered.api.plugin.Plugin;
import com.velocitypowered.api.proxy.InboundConnection;
import com.velocitypowered.api.proxy.Player;
import com.velocitypowered.api.proxy.ProxyServer;
import com.velocitypowered.api.scheduler.ScheduledTask;
import com.velocitypowered.api.util.GameProfile;
import io.helicraft.minecraft.AntaresClient;
import io.helicraft.minecraft.ApiModels;
import java.net.InetSocketAddress;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import net.elytrium.limboapi.api.Limbo;
import net.elytrium.limboapi.api.LimboFactory;
import net.elytrium.limboapi.api.LimboSessionHandler;
import net.elytrium.limboapi.api.chunk.Dimension;
import net.elytrium.limboapi.api.event.LoginLimboRegisterEvent;
import net.elytrium.limboapi.api.player.GameMode;
import net.elytrium.limboapi.api.player.LimboPlayer;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.event.ClickEvent;
import net.kyori.adventure.title.Title;
import org.slf4j.Logger;

@Plugin(
    id = "rigel",
    name = "Rigel",
    version = "0.1.0",
    description = "Antares Minecraft admission",
    authors = {"HeliCraft"},
    dependencies = {@Dependency(id = "limboapi")})
public final class RigelPlugin {
  private static final Component DENIED =
      Component.text(
          "Minecraft sign-in unavailable. Reconnect and confirm your own code on the website. / Вход недоступен. Подключитесь снова и подтвердите свой код на сайте.");
  private final Logger logger;
  private final ProxyServer proxy;
  private final Map<InetSocketAddress, Pending> pending = new ConcurrentHashMap<>();
  private AntaresClient api;
  private Limbo lobby;
  private ScheduledTask sweep;
  private String siteOrigin;

  @Inject
  public RigelPlugin(Logger logger, ProxyServer proxy) {
    this.logger = logger;
    this.proxy = proxy;
  }

  @Subscribe
  public void onInitialize(ProxyInitializeEvent event) {
    siteOrigin = System.getenv().getOrDefault("SITE_ORIGIN", "http://localhost:5173");
    String token = System.getenv("RIGEL_SERVICE_TOKEN");
    if (token == null) {
      logger.error("Rigel requires RIGEL_SERVICE_TOKEN; all Minecraft admission is denied");
      return;
    }
    api =
        new AntaresClient(
            System.getenv().getOrDefault("ANTARES_URL", "http://localhost:3000"),
            token,
            AntaresClient.configuredTimeout());
    Object instance =
        proxy
            .getPluginManager()
            .getPlugin("limboapi")
            .flatMap(plugin -> plugin.getInstance())
            .orElseThrow();
    if (!(instance instanceof LimboFactory factory)) {
      throw new IllegalStateException("Compatible LimboAPI is required");
    }
    var world = factory.createVirtualWorld(Dimension.OVERWORLD, 0, 64, 0, 0, 0);
    world.setBlock(0, 63, 0, factory.createSimpleBlock("minecraft:stone"));
    lobby =
        factory
            .createLimbo(world)
            .setName("RigelAuth")
            .setGameMode(GameMode.ADVENTURE)
            .setReadTimeout(15000)
            .setViewDistance(2)
            .setSimulationDistance(2);
    sweep =
        proxy.getScheduler().buildTask(this, this::tick).repeat(Duration.ofSeconds(1)).schedule();
    logger.info("Rigel ready: Antares identity, isolated Limbo auth and guarded backend admission");
  }

  @Subscribe(priority = Short.MIN_VALUE)
  public EventTask onPreLogin(PreLoginEvent event) {
    if (api == null || lobby == null || !event.getResult().isAllowed()) {
      event.setResult(PreLoginEvent.PreLoginComponentResult.denied(DENIED));
      return null;
    }
    UUID connectionId = UUID.randomUUID();
    return EventTask.resumeWhenComplete(
        api.post(
                "/api/v1/internal/minecraft/challenges",
                new ApiModels.Connect(event.getUsername(), connectionId),
                ApiModels.Challenge.class)
            .handle(
                (challenge, error) -> {
                  if (error != null) {
                    String message = "Sign-in temporarily unavailable / Вход временно недоступен";
                    Throwable cause = error.getCause() == null ? error : error.getCause();
                    if (cause instanceof AntaresClient.ApiException rejected) {
                      if (rejected.status() == 404) {
                        message =
                            "Register on the website / Зарегистрируйтесь на сайте: "
                                + siteOrigin
                                + "/register";
                      } else if (rejected.status() == 409) {
                        message =
                            "Another Minecraft connection is active. Disconnect it or wait for expiry / Другое подключение уже активно. Выйдите или дождитесь истечения.";
                      }
                    }
                    event.setResult(
                        PreLoginEvent.PreLoginComponentResult.denied(Component.text(message)));
                  } else {
                    Pending connection =
                        new Pending(
                            event.getConnection(), new AuthAttempt(challenge, connectionId));
                    Pending old =
                        pending.putIfAbsent(event.getConnection().getRemoteAddress(), connection);
                    if (old != null || !event.getConnection().isActive()) {
                      release(connection);
                      event.setResult(PreLoginEvent.PreLoginComponentResult.denied(DENIED));
                    }
                  }
                  return null;
                }));
  }

  @Subscribe(priority = Short.MIN_VALUE)
  public void onProfile(GameProfileRequestEvent event) {
    Pending connection = pending.get(event.getConnection().getRemoteAddress());
    if (connection == null || connection.auth.closed()) {
      throw new IllegalStateException("No Antares identity for this connection");
    }
    var identity = connection.auth.challenge;
    event.setGameProfile(new GameProfile(identity.accountId(), identity.username(), List.of()));
    logger.info("Rigel profile assigned account {}", identity.accountId());
  }

  @Subscribe
  public void onLimbo(LoginLimboRegisterEvent event) {
    Player player = event.getPlayer();
    Pending connection = pending.get(player.getRemoteAddress());
    if (connection == null || !player.getUniqueId().equals(connection.auth.challenge.accountId())) {
      player.disconnect(DENIED);
      return;
    }
    connection.player = player;
    event.addOnJoinCallback(() -> lobby.spawnPlayer(player, new LobbySession(connection)));
  }

  @Subscribe(priority = Short.MIN_VALUE)
  public void onLogin(LoginEvent event) {
    Pending connection = pending.get(event.getPlayer().getRemoteAddress());
    if (connection == null
        || !connection.auth.authenticated()
        || !event.getPlayer().getUniqueId().equals(connection.auth.challenge.accountId())) {
      event.setResult(ComponentResult.denied(DENIED));
    } else {
      logger.info("Rigel login admitted account {}", event.getPlayer().getUniqueId());
    }
  }

  @Subscribe(priority = Short.MIN_VALUE)
  public EventTask onBackend(ServerPreConnectEvent event) {
    Player player = event.getPlayer();
    Pending connection = pending.get(player.getRemoteAddress());
    var destination = event.getResult().getServer();
    boolean allowed =
        connection != null
            && connection.auth.authenticated()
            && player.getUniqueId().equals(connection.auth.challenge.accountId())
            && destination.isPresent()
            && destination
                .get()
                .getServerInfo()
                .getName()
                .equals(connection.auth.admission().backendId())
            && event
                .getOriginalServer()
                .getServerInfo()
                .getName()
                .equals(connection.auth.admission().backendId());
    event.setResult(ServerPreConnectEvent.ServerResult.denied());
    if (!allowed || connection == null) {
      player.disconnect(DENIED);
      return null;
    }
    return EventTask.resumeWhenComplete(
        heartbeat(connection)
            .thenAccept(
                result -> {
                  if (connection.auth.authenticated() && destination.isPresent()) {
                    event.setResult(ServerPreConnectEvent.ServerResult.allowed(destination.get()));
                    logger.info("Rigel backend admitted account {}", player.getUniqueId());
                  }
                })
            .exceptionally(
                error -> {
                  player.disconnect(DENIED);
                  return null;
                }));
  }

  @Subscribe
  public void onDisconnect(DisconnectEvent event) {
    Pending connection = pending.get(event.getPlayer().getRemoteAddress());
    if (connection != null && connection.player == event.getPlayer()) {
      release(connection);
    }
  }

  private void tick() {
    for (Pending connection : pending.values()) {
      if (!connection.inbound.isActive()
          || (connection.player != null && !connection.player.isActive())) {
        release(connection);
        continue;
      }
      if (connection.auth.admission() != null) {
        if (System.nanoTime() >= connection.nextHeartbeat
            && connection.auth.busy.compareAndSet(false, true)) {
          connection.nextHeartbeat = System.nanoTime() + Duration.ofSeconds(10).toNanos();
          heartbeat(connection)
              .whenComplete(
                  (result, error) -> {
                    connection.auth.busy.set(false);
                    if (error != null) {
                      disconnect(connection);
                    }
                  });
        }
      } else if (connection.auth.expired()) {
        disconnect(connection);
      } else if (connection.limbo != null && connection.auth.busy.compareAndSet(false, true)) {
        poll(connection);
      }
    }
  }

  private CompletableFuture<ApiModels.SessionResult> heartbeat(Pending connection) {
    return api.post(
            "/api/v1/internal/minecraft/rigel/heartbeat",
            new ApiModels.SessionInput(connection.auth.admission().session().id()),
            ApiModels.SessionResult.class)
        .thenApply(
            result -> {
              connection.auth.refreshed(result.admission());
              if (result.admission() == null || !connection.auth.authenticated()) {
                throw new IllegalStateException("Admission expired");
              }
              return result;
            });
  }

  private void poll(Pending connection) {
    AuthAttempt auth = connection.auth;
    api.post(
            "/api/v1/internal/minecraft/challenges/" + auth.challenge.id() + "/status",
            auth.proof,
            ApiModels.ChallengeResult.class)
        .thenCompose(
            status -> {
              if (auth.closed()) {
                return CompletableFuture.completedFuture(null);
              }
              if ("APPROVED".equals(status.challenge().status())) {
                return api.post(
                        "/api/v1/internal/minecraft/challenges/" + auth.challenge.id() + "/consume",
                        auth.proof,
                        ApiModels.ChallengeResult.class)
                    .thenAccept(
                        result -> {
                          if (auth.admit(result.admission()) && connection.player.isActive()) {
                            connection
                                .limbo
                                .getScheduledExecutor()
                                .execute(() -> connection.limbo.disconnect());
                          } else {
                            if (result.admission() != null) {
                              closeSession(result.admission().session().id());
                            }
                            disconnect(connection);
                          }
                        });
              }
              if (!"WAITING_AUTH".equals(status.challenge().status())) {
                disconnect(connection);
              }
              return CompletableFuture.completedFuture(null);
            })
        .whenComplete(
            (result, error) -> {
              auth.busy.set(false);
              if (error != null) {
                disconnect(connection);
              }
            });
  }

  private void disconnect(Pending connection) {
    if (connection.player != null) {
      connection.player.disconnect(DENIED);
    }
    release(connection);
  }

  private CompletableFuture<ApiModels.SessionResult> closeSession(UUID id) {
    return api.post(
        "/api/v1/internal/minecraft/rigel/close",
        new ApiModels.SessionInput(id),
        ApiModels.SessionResult.class);
  }

  private CompletableFuture<?> release(Pending connection) {
    if (!connection.auth.close()) {
      return CompletableFuture.completedFuture(null);
    }
    pending.remove(connection.inbound.getRemoteAddress(), connection);
    if (connection.auth.admission() != null) {
      return closeSession(connection.auth.admission().session().id()).exceptionally(error -> null);
    }
    return api.post(
            "/api/v1/internal/minecraft/challenges/" + connection.auth.challenge.id() + "/cancel",
            connection.auth.proof,
            ApiModels.ChallengeResult.class)
        .exceptionally(error -> null);
  }

  @Subscribe
  public EventTask onShutdown(ProxyShutdownEvent event) {
    if (sweep != null) {
      sweep.cancel();
    }
    if (api == null) {
      return null;
    }
    CompletableFuture<?>[] closing =
        pending.values().stream().map(this::release).toArray(CompletableFuture<?>[]::new);
    return EventTask.resumeWhenComplete(
        CompletableFuture.allOf(closing)
            .whenComplete(
                (result, error) -> {
                  if (lobby != null) {
                    lobby.dispose();
                  }
                  api.close();
                }));
  }

  private static final class Pending {
    final InboundConnection inbound;
    final AuthAttempt auth;
    volatile Player player;
    volatile LimboPlayer limbo;
    volatile long nextHeartbeat;

    Pending(InboundConnection inbound, AuthAttempt auth) {
      this.inbound = inbound;
      this.auth = auth;
    }
  }

  private final class LobbySession implements LimboSessionHandler {
    private final Pending connection;

    LobbySession(Pending connection) {
      this.connection = connection;
    }

    @Override
    public void onSpawn(Limbo server, LimboPlayer player) {
      connection.limbo = player;
      player.disableFalling();
      var challenge = connection.auth.challenge;
      Player client = player.getProxyPlayer();
      client.showTitle(
          Title.title(
              Component.text(challenge.serverName()),
              Component.text("Confirm sign-in / Подтвердите вход")));
      client.sendMessage(
          Component.text(challenge.confirmationUrl())
              .clickEvent(ClickEvent.openUrl(challenge.confirmationUrl())));
      client.sendMessage(
          Component.text("Code / Код: " + challenge.code() + " · 120 seconds / секунд"));
      client.sendMessage(
          Component.text(
              "Enter this code in your signed-in website account. Never approve someone else's code. / Введите этот код в своём кабинете. Не подтверждайте чужой вход."));
      client.sendActionBar(
          Component.text("Waiting for browser confirmation / Ожидание подтверждения в браузере"));
      logger.info("Rigel auth lobby entered account {}", challenge.accountId());
    }

    @Override
    public void onDisconnect() {
      if (connection.auth.admission() == null) {
        disconnect(connection);
      }
    }
  }
}
