[Русский](product-map_RU.md) | [HeliCraft](../README.md)

# HeliCraft product map

This is the target product model. The current projects provide minimal examples and connections; the gameplay described below remains future work.

## Vega

**Vega is HeliCraft's main web interface and the other half of the game.** Players see a living world of history, states, economics, laws, organizations and events.

Players catch up on events, explore the map, interact with their state, vote and govern, read laws and decisions, manage companies and property, trade, study currencies and markets, browse history, manage their account and security, and receive notifications and personal actions requiring attention.

Vega answers: **What changed? What is happening? What can I do?**

## Antares

**Antares is the logic and memory of HeliCraft.** It is the single source of truth for the world's social, political, legal and economic state.

It understands identities, states, territorial ownership, laws, institutions, companies, assets, currencies, trades, decisions and historical events. Players rarely interact with it directly, but every product must describe the same world.

Vega lets players see and manage the world; Minecraft lets them physically inhabit it; Antares makes the state consistent. The future World Engine detects changes and turns them into new reasons to act.

## Deneb

**Deneb is HeliCraft's presence inside Minecraft.** It makes abstractions part of ordinary physical gameplay, keeping menus to the necessary minimum.

Players cross borders, enter jurisdictions, interact with protected property, build institutions, obey or break rules, explore geology and mineral deposits, bring real goods to market and experience the physical consequences of other players' decisions.

A state's central bank should be a real place. A territory's map color should correspond to real ownership and jurisdiction.

## Rigel

**Rigel is entry into HeliCraft and protection of player identity.** It asks: **Who is trying to enter, and do they have the right?**

HeliCraft plans to support official Minecraft accounts and players without a license. Permanent HeliCraft identity must be independent of a Minecraft account or login method. Proof of access can include an official account, additional factors, confirmation through Vega, future Altair and other authorization methods.

Buying Minecraft and linking an official account later preserves the same identity, property, history, citizenship, companies, money and achievements. Rigel is the permanent game identity system.

This flow is not implemented in the baseline. Velocity retains standard official-account authentication until an identity API and reviewed access flow exist.

## Atria

**Atria is HeliCraft's visual language.** It makes Vega, Altair and future interfaces feel like one product.

It defines appearance, colors, typography, controls, forms, windows, tables, states, animation and interaction rules. Laws, banking operations, notifications, votes, errors and government decisions should remain recognizable, understandable and consistent across applications.

## Alhena

**Alhena is HeliCraft's official programming interface and ecosystem SDK.** It gives programs a consistent way to communicate with Antares.

Initially it serves Vega and future Altair. Later it can support third-party sites, community tools, Discord bots, analytics, widgets, external applications, automation and public integrations. Developers get methods and types from one API contract. Initially internal, the SDK may eventually become public.

## Altair

**Altair is an optional desktop application.** Players must always be able to open an ordinary Minecraft launcher, connect and play.

Its future scope includes signing in, launching Minecraft, managing installed Java, recommended QoL mods and resource packs, world news, server status, notifications, device management and security, quick access to Vega and diagnostic collection. It could also provide convenient secure authentication for players without official accounts.

**Altair offers a better path into HeliCraft, not the only path.** Its directory currently contains documentation only, planning Tauri 2, Rust, React, Vite, Atria and Alhena.

## Connections

```text
                  HeliCraft
            ┌─────────┴─────────┐
         Minecraft             Web
            │                   │
          Deneb                Vega
            └─────────┬─────────┘
                   Antares
                       │
                  world state

Player → Rigel → identity and access check → Minecraft
Atria → a shared interface language
Alhena → a shared way to communicate with Antares
Altair → an optional desktop entry point
```

Only Antares accesses PostgreSQL/PostGIS and S3. Vega uses Alhena over REST; Java plugins use HTTP. Atria and Alhena are private workspace packages. Future implementation should preserve these roles and boundaries.

## Names

Project headings, code and paths retain English names. Russian conversation uses Вега, Антарес, Денеб, Ригель, Атриа, Альхена and Альтаир for their stars. Each project's README contains a short star reference.
