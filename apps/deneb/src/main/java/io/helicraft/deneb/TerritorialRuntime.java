package io.helicraft.deneb;

import io.helicraft.minecraft.AntaresClient;
import io.helicraft.minecraft.SpatialModels;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.function.Function;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.title.Title;
import org.bukkit.Location;
import org.bukkit.World;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerChangedWorldEvent;
import org.bukkit.event.player.PlayerMoveEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.event.player.PlayerTeleportEvent;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

/** All Bukkit access and notifications stay on the main thread; I/O belongs to SpatialEngine. */
final class TerritorialRuntime implements Listener, AutoCloseable {
  private static final int MAX_TITLE_LENGTH = 256;
  private final JavaPlugin plugin;
  private final SpatialEngine engine;
  private final Function<Player, String> language;
  private final JurisdictionTracker tracker = new JurisdictionTracker();
  private final BukkitTask reconcile;
  private final BukkitTask observe;

  private record Position(
      SpatialSnapshot.Jurisdiction jurisdiction, SpatialEngine.View view, boolean known) {}

  TerritorialRuntime(JavaPlugin plugin, AntaresClient api, Function<Player, String> language) {
    this.plugin = plugin;
    this.language = language;
    engine = new SpatialEngine(api, message -> plugin.getLogger().info(message));
    plugin.getServer().getPluginManager().registerEvents(this, plugin);
    for (World world : plugin.getServer().getWorlds()) {
      plugin
          .getLogger()
          .info("Spatial Paper world " + world.getUID() + " dimension " + world.getKey());
    }
    reconcile = plugin.getServer().getScheduler().runTaskTimer(plugin, this::reconcile, 1L, 100L);
    observe = plugin.getServer().getScheduler().runTaskTimer(plugin, this::observePlayers, 5L, 5L);
  }

  private void reconcile() {
    List<SpatialModels.WorldIdentity> worlds =
        plugin.getServer().getWorlds().stream()
            .map(
                world -> new SpatialModels.WorldIdentity(world.getUID(), world.getKey().toString()))
            .toList();
    engine.refresh(worlds);
  }

  private Position position(Location location) {
    if (location.getWorld() == null) {
      return new Position(null, null, false);
    }
    SpatialEngine.View view = engine.view(location.getWorld().getUID());
    boolean commons =
        List.of("minecraft:the_nether", "minecraft:the_end")
            .contains(location.getWorld().getKey().toString());
    return new Position(
        view == null ? null : view.snapshot().locate(location.getX(), location.getZ()),
        view,
        view != null || commons);
  }

  private void observePlayers() {
    for (Player player : plugin.getServer().getOnlinePlayers()) {
      observe(player, player.getLocation());
    }
  }

  private void observe(Player player, Location location) {
    if (language.apply(player) == null) {
      return;
    }
    Position position = position(location);
    if (!position.known() || location.getWorld() == null) {
      tracker.unknown(player.getUniqueId());
      return;
    }
    JurisdictionTracker.Transition transition =
        tracker.observe(
            player.getUniqueId(),
            location.getWorld().getUID(),
            position.jurisdiction(),
            System.nanoTime());
    if (transition != null) {
      announce(player, transition, position.view() != null && position.view().stale());
    }
  }

  @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
  public void onMove(PlayerMoveEvent event) {
    if (event.getTo() != null
        && (event.getFrom().getX() != event.getTo().getX()
            || event.getFrom().getZ() != event.getTo().getZ())) {
      observe(event.getPlayer(), event.getTo());
    }
  }

  @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
  public void onTeleport(PlayerTeleportEvent event) {
    if (event.getTo() != null) {
      observe(event.getPlayer(), event.getTo());
    }
  }

  @EventHandler
  public void onWorldChange(PlayerChangedWorldEvent event) {
    observe(event.getPlayer(), event.getPlayer().getLocation());
  }

  @EventHandler
  public void onQuit(PlayerQuitEvent event) {
    tracker.remove(event.getPlayer().getUniqueId());
  }

  private static String name(SpatialSnapshot.Jurisdiction jurisdiction, boolean russian) {
    return jurisdiction == null
        ? (russian ? "Независимая территория" : "Wilderness")
        : jurisdiction.name(russian ? "ru" : "en");
  }

  private void announce(Player player, JurisdictionTracker.Transition transition, boolean stale) {
    boolean russian = "ru".equals(language.apply(player));
    String title = name(transition.current(), russian);
    String subtitle =
        transition.previous() == null
            ? (russian ? "Вы входите в государство" : "Entering state territory")
            : (russian ? "Вы покидаете " : "Leaving ") + name(transition.previous(), russian);
    if (stale) {
      subtitle = russian ? "Последняя подтверждённая юрисдикция" : "Last verified jurisdiction";
    }
    player.showTitle(
        Title.title(
            Component.text(shorten(title)),
            Component.text(shorten(subtitle)),
            Title.Times.times(
                Duration.ofMillis(150), Duration.ofSeconds(2), Duration.ofMillis(350))));
  }

  private static String shorten(String value) {
    int length = value.codePointCount(0, value.length());
    return length <= MAX_TITLE_LENGTH
        ? value
        : value.substring(0, value.offsetByCodePoints(0, MAX_TITLE_LENGTH)) + "…";
  }

  void whereami(Player player) {
    Location location = player.getLocation();
    Position position = position(location);
    boolean russian = "ru".equals(language.apply(player));
    player.sendMessage(
        Component.text(
            location.getWorld().getName()
                + " · "
                + String.format(
                    Locale.ROOT,
                    "X %.2f · Y %.2f · Z %.2f",
                    location.getX(),
                    location.getY(),
                    location.getZ())));
    if (!position.known()) {
      player.sendMessage(
          Component.text(russian ? "Юрисдикция неизвестна" : "Jurisdiction unavailable"));
      return;
    }
    String prefix =
        position.view() != null && position.view().stale()
            ? (russian ? "Последняя подтверждённая: " : "Last verified: ")
            : "";
    player.sendMessage(Component.text(prefix + name(position.jurisdiction(), russian)));
    if (position.view() != null && player.hasPermission("helicraft.spatial.debug")) {
      player.sendMessage(
          Component.text(
              "Spatial snapshot "
                  + position.view().snapshot().worldId()
                  + " revision "
                  + position.view().snapshot().version()));
    }
  }

  void borders(Player player) {
    whereami(player);
    player.sendMessage(
        Component.text(
            "ru".equals(language.apply(player))
                ? "Государственные границы видны на политической карте сайта."
                : "State boundaries are visible on the website's political map."));
  }

  @Override
  public void close() {
    reconcile.cancel();
    observe.cancel();
    engine.close();
  }
}
