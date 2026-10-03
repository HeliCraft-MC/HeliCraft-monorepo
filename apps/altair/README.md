[Русский](README_RU.md) | [HeliCraft](../../README.md)

# Altair

**Make desktop entry and everyday use more convenient; always optional.**

Planned: Tauri 2 · Rust · React · Vite · Atria · Alhena

**Planned only. No application, package.json, Rust crate, build script or Compose is created.**

The intended stack is Tauri 2 + Rust + React + Vite, with Atria for UI and Alhena for the Antares API. Future setup should follow the official [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) and [Vite integration](https://v2.tauri.app/start/frontend/vite/) and use Bun for frontend dependencies/scripts. Rust and native OS build dependencies remain separate.

Altair may handle HeliCraft login, Minecraft launch, Java management, QoL mods, resource packs, world news, server status, notifications, device security, links to Vega and diagnostics. No Minecraft downloads, account flow or updater is configured at this stage.

The launcher must remain optional: players can always open their usual Minecraft launcher, connect and play. Altair offers a more convenient path, never the only path. Future work must choose supported platforms, desktop permissions/capabilities, signing and distribution before implementing launch/install behavior.

## Name

α Aquilae, in the constellation Aquila. [IAU star-name catalogue](https://iauarchive.eso.org/public/themes/naming_stars/).
