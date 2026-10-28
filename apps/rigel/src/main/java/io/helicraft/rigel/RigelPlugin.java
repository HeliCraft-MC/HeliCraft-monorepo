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
import io.helicraft.minecraft.GameUi;
import java.net.InetSocketAddress;
import java.time.Duration;
import java.time.Instant;
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
import net.kyori.adventure.bossbar.BossBar;
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
      GameUi.failure(
          "Sign-in unavailable / Вход недоступен",
          "Reconnect and confirm on the website.\nПодключитесь снова и подтвердите вход на сайте.");
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
    for (int x = -5; x <= 5; x++) {
      for (int z = -5; z <= 5; z++) {
        String block =
            Math.abs(x) == 5 || Math.abs(z) == 5
                ? "minecraft:polished_deepslate"
                : "minecraft:smooth_quartz";
        world.setBlock(x, 63, z, factory.createSimpleBlock(block));
      }
    }
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
                new ApiModels.Connect(
                    event.getUsername(),
                    connectionId,
                    new ApiModels.ClientConnection(
                        event.getConnection().getRemoteAddress().getAddress().getHostAddress(),
                        event.getConnection().getRemoteAddress().getPort(),
                        event.getConnection().getProtocolVersion().getProtocol(),
                        String.join(
                            " / ",
                            event.getConnection().getProtocolVersion().getVersionsSupportedBy()))),
                ApiModels.Challenge.class)
            .handle(
                (challenge, error) -> {
                  if (error != null) {
                    Component message = DENIED;
                    Throwable cause = error.getCause() == null ? error : error.getCause();
                    if (cause instanceof AntaresClient.ApiException rejected) {
                      if (rejected.status() == 404) {
                        message =
                            GameUi.failure(
                                "Account not found / Аккаунт не найден",
                                "Create a website account and use its username.\nСоздайте аккаунт на сайте и используйте его имя.\n\n"
                                    + siteOrigin
                                    + "/register");
                      } else if (rejected.status() == 409) {
                        message =
                            GameUi.failure(
                                "Already connected / Подключение уже открыто",
                                "Close your other game connection, then reconnect.\nЗакройте другое подключение к игре и подключитесь снова.\n\n"
                                    + "After a crash, wait for the session to expire.\nПосле сбоя дождитесь завершения прежней сессии.");
                      }
                    }
                    event.setResult(PreLoginEvent.PreLoginComponentResult.denied(message));
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
        disconnect(connection, AuthMessages.End.EXPIRED);
      } else if (connection.limbo != null && connection.auth.busy.compareAndSet(false, true)) {
        updateCountdown(connection);
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
                            clearWaitingUi(connection);
                            connection.player.sendActionBar(
                                Component.text(
                                    russian(connection)
                                        ? "Вход подтверждён · подключаем к миру"
                                        : "Sign-in confirmed · joining the world",
                                    GameUi.SUCCESS));
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
                AuthMessages.End reason =
                    switch (status.challenge().status()) {
                      case "REJECTED" -> AuthMessages.End.REJECTED;
                      case "EXPIRED" -> AuthMessages.End.EXPIRED;
                      default -> AuthMessages.End.CLOSED;
                    };
                disconnect(connection, reason);
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
    disconnect(connection, AuthMessages.End.UNAVAILABLE);
  }

  private void disconnect(Pending connection, AuthMessages.End reason) {
    if (connection.player != null) {
      boolean russian = russian(connection);
      connection.player.disconnect(
          GameUi.failure(AuthMessages.title(reason, russian), AuthMessages.recovery(russian)));
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
    clearWaitingUi(connection);
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
    volatile BossBar countdown;
    volatile long initialSeconds;

    Pending(InboundConnection inbound, AuthAttempt auth) {
      this.inbound = inbound;
      this.auth = auth;
    }
  }

  private static boolean russian(Pending connection) {
    return connection.player != null
        && connection.player.getEffectiveLocale() != null
        && "ru".equals(connection.player.getEffectiveLocale().getLanguage());
  }

  private static void clearWaitingUi(Pending connection) {
    BossBar countdown = connection.countdown;
    if (countdown != null && connection.player != null) {
      connection.player.hideBossBar(countdown);
      connection.countdown = null;
    }
  }

  private static void updateCountdown(Pending connection) {
    BossBar countdown = connection.countdown;
    if (countdown == null || connection.auth.closed()) {
      return;
    }
    long seconds =
        AuthMessages.remainingSeconds(connection.auth.challenge.expiresAt(), Instant.now());
    countdown
        .name(
            Component.text(
                (russian(connection) ? "Подтвердите вход на сайте · " : "Confirm on the website · ")
                    + AuthMessages.countdown(seconds),
                GameUi.TEXT))
        .progress(Math.clamp((float) seconds / Math.max(1L, connection.initialSeconds), 0f, 1f))
        .color(seconds <= 20 ? BossBar.Color.RED : BossBar.Color.YELLOW);
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
      boolean russian = russian(connection);
      client.showTitle(
          Title.title(
              Component.text(GameUi.shorten(challenge.serverName(), 48), GameUi.ACCENT),
              Component.text(
                  russian ? "Откройте ссылку в чате" : "Open the link in chat", GameUi.TEXT),
              Title.Times.times(
                  Duration.ofMillis(250), Duration.ofSeconds(4), Duration.ofMillis(400))));
      client.sendMessage(
          GameUi.card(
              GameUi.heading(russian ? "Подтверждение входа" : "Confirm your sign-in"),
              GameUi.row(russian ? "Игрок" : "Player", challenge.username()),
              Component.empty(),
              GameUi.action(
                  russian ? "Открыть сайт и подтвердить" : "Open website to confirm",
                  ClickEvent.openUrl(challenge.confirmationUrl()),
                  russian
                      ? "Войдите в свой аккаунт и подтвердите этот вход."
                      : "Sign into your account and approve this connection."),
              GameUi.muted(
                  russian
                      ? "Ссылка уже содержит код. Мир откроется после вашего решения."
                      : "The link includes your code. The world opens after your approval."),
              Component.empty(),
              GameUi.row("Code / Код", challenge.code())
                  .clickEvent(ClickEvent.copyToClipboard(challenge.code()))
                  .hoverEvent(
                      net.kyori.adventure.text.event.HoverEvent.showText(
                          Component.text(
                              russian
                                  ? "Скопировать код для ручного ввода на сайте"
                                  : "Copy code for manual entry on the website"))),
              GameUi.muted(
                  russian
                      ? "Не передавайте ссылку или код другим людям."
                      : "Keep this link and code to yourself.")));
      connection.initialSeconds =
          AuthMessages.remainingSeconds(challenge.expiresAt(), Instant.now());
      connection.countdown =
          BossBar.bossBar(Component.empty(), 1f, BossBar.Color.YELLOW, BossBar.Overlay.PROGRESS);
      updateCountdown(connection);
      client.showBossBar(connection.countdown);
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
