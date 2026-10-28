package io.helicraft.deneb;

import io.helicraft.minecraft.ApiModels.Profile;
import io.helicraft.minecraft.GameUi;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.event.ClickEvent;
import net.kyori.adventure.text.event.HoverEvent;

final class PlayerUi {
  private PlayerUi() {}

  static Component help(Profile profile, boolean russian) {
    return GameUi.card(
        GameUi.heading(profile.serverName()),
        GameUi.muted(russian ? "Выберите действие в чате" : "Choose an action in chat"),
        Component.empty(),
        GameUi.command("/heli profile", russian ? "Имя и гражданство" : "Name and citizenships"),
        GameUi.command("/heli whereami", russian ? "Где я нахожусь" : "My current location"),
        GameUi.command("/heli borders", russian ? "Границы на карте" : "Borders on the map"),
        GameUi.command("/heli status", russian ? "Состояние входа" : "Sign-in status"));
  }

  static Component profile(Profile profile, boolean russian) {
    return GameUi.card(
        GameUi.heading(russian ? "Ваш профиль" : "Your profile"),
        GameUi.row(russian ? "Игрок" : "Player", profile.username()),
        GameUi.row("UUID", profile.accountId().toString())
            .clickEvent(ClickEvent.copyToClipboard(profile.accountId().toString()))
            .hoverEvent(
                HoverEvent.showText(
                    GameUi.muted(russian ? "Скопировать постоянный UUID" : "Copy permanent UUID"))),
        Component.text(ProfileMessages.citizenship(profile, russian), GameUi.TEXT),
        GameUi.muted(
            russian
                ? "Гражданство и ваше местоположение — разные сведения."
                : "Citizenship and your current location are separate."),
        GameUi.command("/heli whereami", russian ? "Показать местоположение" : "Show my location"));
  }

  static Component status(Profile profile, boolean russian) {
    return GameUi.card(
        GameUi.heading(russian ? "Вы в игре" : "You are signed in"),
        Component.text(
            russian ? "Вход подтверждён на сайте" : "Sign-in confirmed on the website",
            GameUi.SUCCESS),
        GameUi.row(russian ? "Сервер" : "Server", profile.serverName()),
        GameUi.row(russian ? "Игрок" : "Player", profile.username()),
        GameUi.muted(
            russian
                ? "При следующем подключении потребуется новая ссылка."
                : "Your next connection will need a new confirmation link."));
  }

  static Component welcome(Profile profile, boolean russian) {
    return GameUi.card(
        GameUi.heading(ProfileMessages.welcome(profile, russian)),
        Component.text(ProfileMessages.citizenship(profile, russian), GameUi.TEXT),
        GameUi.command("/heli", russian ? "Профиль, карта и помощь" : "Profile, map and help"));
  }

  static Component unavailable(boolean russian) {
    return GameUi.card(
        Component.text(
            russian ? "Профиль временно недоступен" : "Profile temporarily unavailable",
            GameUi.WARNING),
        GameUi.muted(
            russian ? "Подождите немного и повторите команду." : "Wait a moment and try again."));
  }

  static Component disconnected(boolean russian) {
    return GameUi.failure(
        russian ? "Игровая сессия завершена" : "Game session ended",
        russian
            ? "Подключитесь снова и подтвердите новый вход на сайте."
            : "Reconnect and confirm a new sign-in on the website.");
  }
}
