package io.helicraft.deneb;

import io.helicraft.minecraft.AntaresClient;
import io.helicraft.minecraft.ApiModels;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import net.kyori.adventure.text.Component;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.AsyncPlayerPreLoginEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

/** Paper owns physical facts; Antares alone owns admission, UUID and citizenship. */
public final class DenebPlugin extends JavaPlugin implements Listener {
  private final Map<UUID, Connection> connections = new ConcurrentHashMap<>();
  private AntaresClient api;
  private BukkitTask heartbeat;
  private TerritorialRuntime territories;

  @Override
  public void onEnable() {
    String token = System.getenv("DENEB_SERVICE_TOKEN");
    getServer().getPluginManager().registerEvents(this, this);
    if (token == null) {
      getLogger().severe("DENEB_SERVICE_TOKEN missing; all player admission is denied");
      return;
    }
    api =
        new AntaresClient(
            System.getenv().getOrDefault("ANTARES_URL", "http://localhost:3000"),
            token,
            AntaresClient.configuredTimeout());
    territories = new TerritorialRuntime(this, api, this::verifiedLocale);
    var command = getCommand("heli");
    if (command == null) {
      throw new IllegalStateException("Missing /heli command");
    }
    command.setExecutor(
        (sender, cmd, label, args) -> {
          if (!(sender instanceof Player player)) {
            sender.sendMessage(Component.text("Use /heli in game."));
            return true;
          }
          Connection connection = connections.get(player.getUniqueId());
          if (connection == null
              || connection.profile == null
              || !connection.admission.session().valid()) {
            player.sendMessage(
                Component.text("Profile temporarily unavailable / Профиль временно недоступен"));
            return true;
          }
          boolean russian = "ru".equals(verifiedLocale(player));
          if (args.length > 0 && "whereami".equalsIgnoreCase(args[0])) {
            territories.whereami(player);
          } else if (args.length > 0 && "borders".equalsIgnoreCase(args[0])) {
            territories.borders(player);
          } else if (args.length > 0 && "status".equalsIgnoreCase(args[0])) {
            player.sendMessage(
                Component.text(
                    russian ? "Антарес: соединение подтверждено" : "Antares: connection verified"));
          } else if (args.length > 0 && "profile".equalsIgnoreCase(args[0])) {
            sendProfile(player, connection);
          } else {
            player.sendMessage(
                Component.text(
                    connection.profile.serverName()
                        + " · /heli status · /heli profile · /heli whereami · /heli borders"));
          }
          return true;
        });
    heartbeat = Bukkit.getScheduler().runTaskTimer(this, this::heartbeat, 200L, 200L);
    getLogger().info("Deneb ready: forwarded UUID admission, /heli and leased Paper presence");
  }

  private void sendProfile(Player player, Connection connection) {
    UUID accountId = player.getUniqueId();
    boolean russian = "ru".equals(verifiedLocale(player));
    api.post(
            "/api/v1/internal/minecraft/paper/profile",
            new ApiModels.ProfileInput(
                accountId, connection.admission.session().username(), russian ? "ru" : "en"),
            ApiModels.Profile.class)
        .whenComplete(
            (profile, error) ->
                mainThread(
                    () -> {
                      if (connections.get(accountId) != connection || !player.isOnline()) {
                        return;
                      }
                      if (error != null
                          || profile == null
                          || !profile.accountId().equals(accountId)) {
                        player.sendMessage(
                            Component.text(
                                russian
                                    ? "Профиль временно недоступен"
                                    : "Profile temporarily unavailable"));
                        return;
                      }
                      connection.profile = profile;
                      player.sendMessage(Component.text(profile.username() + " · " + accountId));
                      player.sendMessage(
                          Component.text(
                              ProfileMessages.citizenship(
                                  profile,
                                  ProfileMessages.locale(profile, player.locale().getLanguage())
                                      .equals("ru"))));
                    }));
  }

  private String verifiedLocale(Player player) {
    Connection connection = connections.get(player.getUniqueId());
    return connection == null || connection.profile == null
        ? null
        : ProfileMessages.locale(connection.profile, player.locale().getLanguage());
  }

  @EventHandler
  public void onPreLogin(AsyncPlayerPreLoginEvent event) {
    if (api == null || event.getLoginResult() != AsyncPlayerPreLoginEvent.Result.ALLOWED) {
      event.disallow(
          AsyncPlayerPreLoginEvent.Result.KICK_OTHER,
          Component.text("Minecraft admission unavailable"));
      return;
    }
    // This event is explicitly asynchronous. Bound the HTTP wait before any world/playerdata
    // access.
    try {
      var admission =
          api.post(
                  "/api/v1/internal/minecraft/paper/admission",
                  new ApiModels.PaperIdentity(event.getUniqueId(), event.getName()),
                  ApiModels.Admission.class)
              .orTimeout(
                  api.requestTimeout().toMillis() + 1000,
                  java.util.concurrent.TimeUnit.MILLISECONDS)
              .join();
      if (!admission.session().accountId().equals(event.getUniqueId())
          || !admission.session().username().equals(event.getName())
          || !admission.session().valid()) {
        throw new IllegalStateException("Forwarded identity mismatch");
      }
      Connection connection = new Connection(admission);
      if (connections.putIfAbsent(event.getUniqueId(), connection) != null) {
        throw new IllegalStateException("Duplicate player connection");
      }
    } catch (java.util.concurrent.CompletionException | IllegalStateException error) {
      event.disallow(
          AsyncPlayerPreLoginEvent.Result.KICK_OTHER,
          Component.text("Minecraft admission rejected / Игровой вход отклонён"));
    }
  }

  @EventHandler
  public void onJoin(PlayerJoinEvent event) {
    Player player = event.getPlayer();
    UUID accountId = player.getUniqueId();
    Connection connection = connections.get(player.getUniqueId());
    if (connection == null || api == null) {
      player.kick(Component.text("Minecraft admission unavailable"));
      return;
    }
    connection.player = player;
    String locale = player.locale().getLanguage().equals("ru") ? "ru" : "en";
    api.post(
            "/api/v1/internal/minecraft/deneb/join",
            new ApiModels.SessionInput(connection.admission.session().id()),
            ApiModels.SessionResult.class)
        .thenCompose(
            result -> {
              if (result.admission() == null
                  || !result.admission().session().accountId().equals(accountId)) {
                throw new IllegalStateException("Admission mismatch");
              }
              connection.admission = result.admission();
              return api.post(
                  "/api/v1/internal/minecraft/paper/profile",
                  new ApiModels.ProfileInput(
                      connection.admission.session().accountId(),
                      connection.admission.session().username(),
                      locale),
                  ApiModels.Profile.class);
            })
        .whenComplete(
            (profile, error) ->
                mainThread(
                    () -> {
                      if (connections.get(player.getUniqueId()) != connection
                          || !player.isOnline()) {
                        return;
                      }
                      if (error != null
                          || profile == null
                          || !profile.accountId().equals(player.getUniqueId())) {
                        player.kick(Component.text("Antares unavailable / Антарес недоступен"));
                        return;
                      }
                      connection.profile = profile;
                      boolean russian = ProfileMessages.locale(profile, locale).equals("ru");
                      player.sendMessage(Component.text(ProfileMessages.welcome(profile, russian)));
                      player.sendMessage(
                          Component.text(ProfileMessages.citizenship(profile, russian)));
                      getLogger().info("Deneb joined account " + player.getUniqueId());
                    }));
  }

  private void mainThread(Runnable action) {
    if (isEnabled()) {
      Bukkit.getScheduler().runTask(this, action);
    }
  }

  private void heartbeat() {
    for (Map.Entry<UUID, Connection> entry : connections.entrySet()) {
      Connection connection = entry.getValue();
      Player player = connection.player;
      if (player == null) {
        if (!connection.admission.session().valid()) {
          connections.remove(entry.getKey(), connection);
          close(connection);
        }
        continue;
      }
      if (!connection.busy.compareAndSet(false, true)) {
        continue;
      }
      api.post(
              "/api/v1/internal/minecraft/deneb/heartbeat",
              new ApiModels.SessionInput(connection.admission.session().id()),
              ApiModels.SessionResult.class)
          .whenComplete(
              (result, error) -> {
                connection.busy.set(false);
                mainThread(
                    () -> {
                      if (connections.get(entry.getKey()) != connection || !player.isOnline()) {
                        return;
                      }
                      if (error != null
                          || result.admission() == null
                          || !result.admission().session().valid()) {
                        player.kick(
                            Component.text("Minecraft session expired / Игровая сессия истекла"));
                      } else {
                        connection.admission = result.admission();
                      }
                    });
              });
    }
  }

  @EventHandler
  public void onQuit(PlayerQuitEvent event) {
    Connection connection = connections.remove(event.getPlayer().getUniqueId());
    if (connection != null) {
      close(connection);
    }
  }

  private void close(Connection connection) {
    if (api != null) {
      api.post(
              "/api/v1/internal/minecraft/deneb/close",
              new ApiModels.SessionInput(connection.admission.session().id()),
              ApiModels.SessionResult.class)
          .exceptionally(error -> null);
    }
  }

  @Override
  public void onDisable() {
    if (territories != null) {
      territories.close();
    }
    if (heartbeat != null) {
      heartbeat.cancel();
    }
    for (Connection connection : connections.values()) {
      close(connection);
    }
    connections.clear();
    if (api != null) {
      api.close();
    }
  }

  private static final class Connection {
    volatile ApiModels.Admission admission;
    volatile ApiModels.Profile profile;
    Player player;
    final AtomicBoolean busy = new AtomicBoolean();

    Connection(ApiModels.Admission admission) {
      this.admission = admission;
    }
  }
}
