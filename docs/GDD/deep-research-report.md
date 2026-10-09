# HeliCraft — Research-Backed V1 Game Design Document

## Product thesis and research verdict

The original HeliCraft snapshot already identified the right problem: vanilla Minecraft has an unusually strong self-directed early and midgame, but a mature player eventually reaches a state in which equipment, mobility, farms, storage, and basic resource acquisition stop creating compelling external reasons to return. The proposed answer was to move progression from **player power toward player agency**, and to make the shared world itself—its institutions, relationships, geography, events, and history—the long-term progression object. fileciteturn0file1

Your newer decisions substantially improve that concept. The most important changes are that HeliCraft no longer tries to automate every judgment, no longer requires client-side mods, allows states to intentionally create institutions instead of waiting for a simulation to “unlock” them, separates political jurisdiction from physical property protection, and accepts administration as a legitimate game-master/ratification layer for rare high-value decisions. fileciteturn0file0

After comparing the concept with Minecraft civilization/geopolitical communities, Eco, persistent-world design, virtual-economy research, social-retention research, Paper capabilities, and current Minecraft mechanics, my central conclusion is:

> **HeliCraft has a viable and genuinely differentiable concept, but its differentiator is not any individual feature. It is the loop created when Minecraft geography, player-created states, a serious web application, mechanically recognized law/institutions, and persistent history are treated as one game.**

That distinction matters. There are already servers with nations, claims, scarce resources, economies, wars, web maps, and historical wikis. CivMC explicitly uses mechanics intended to make players dependent on one another and capable of enforcing their own rules; its Realistic Biomes system geographically restricts production precisely to encourage expansion and trade. EarthMC has player nations, a player-driven economy and a long historical record. Stoneworks markets itself around player-created nations, politics and storytelling. Eco goes even further by combining physical government buildings, constitutions, elections, machine-readable laws, taxation and a browser interface. citeturn15view4turn15view5turn17search0turn15view3

What is much less common is the combination you are converging on:

**Minecraft** determines where things physically are and what players physically did.

**The website** determines what those things _mean_: ownership, jurisdiction, constitution, company, currency, law, case, institution, history.

**The server plugin** continuously translates between those two representations.

That is the potential product identity.

### Why the retention theory is credible

There is external evidence for the broader hypothesis behind the design. A study of 51,104 multiplayer-game players found that achievement-related features were more predictive earlier in the player lifecycle, while social features became the strongest predictors of longevity at the highest player level. That does not prove HeliCraft will retain Minecraft players, but it is unusually consistent with your proposed transition from vanilla achievement progression toward social agency for veterans. citeturn16view0

Research on large multiplayer social networks has likewise found long-term engagement associated with stronger social-group structure, while broader research on online-game communities links group cohesion, social interaction and community attachment with satisfaction and continued participation. Minecraft-specific research with youth communities also shows that governance structures and rules can become meaningful parts of the shared play environment rather than merely moderation infrastructure. citeturn2academia24turn2search4turn2search6turn2search3

This makes your existing friends-community an advantage rather than an embarrassment during the first test. A state simulation launched into an empty anonymous playerbase has a chicken-and-egg problem: politics is worthless before people care about one another. HeliCraft already has the social substrate on which mechanics can be tested.

### What is most likely to attract players

The strongest marketable fantasy is not “realistic economy” or “Minecraft politics.” Both are niche descriptions and can sound like bureaucracy.

The more compelling promise is approximately:

> **A persistent Minecraft world that remembers what players do. Found states, make laws, create currencies and companies, discover strategically important resources, build the institutions behind those systems, and manage them through a second web-based layer connected directly to the world.**

That supports several motivations simultaneously without pretending they are identical.

A builder can construct a courthouse that actually becomes the recognized court.

A social player can found or join a state.

A politically interested player can design a constitution.

An economist can issue a currency or operate a company.

An explorer can discover valuable geological information and keep or sell it.

A PvP-oriented group can eventually negotiate a real war whose possible consequences are agreed in advance.

A casual player can simply live in one of these societies and feel their effects.

That “multiple motivations sharing one world” approach is preferable to forcing every player to become a politician. Contemporary survival communities frequently advertise the opposite of feature overload—preserving a recognizable survival feeling and strong community identity—and some explicitly advertise the absence of Towny/economy/RPG clutter as a benefit. These are marketing anecdotes rather than controlled evidence, but they are a useful warning that feature count itself is not a value proposition. citeturn14search2turn14search12

### What is most likely to repel players

There are five major repulsion risks.

**Bureaucracy without consequence.** If a player spends fifteen minutes passing a law that no one encounters, registering a company that makes nothing, or electing an office with no practical authority, HeliCraft becomes paperwork role-play.

**System opacity.** A newcomer crossing an invisible polygon and suddenly owing a fine is not interesting law gameplay. It is arbitrary punishment.

**Forced socialization.** Resource dependence can encourage trade; making a player ask permission from a president before obtaining basic iron can make the server feel hostile.

**Destructive politics.** If joining a state exposes hundreds of hours of building to confiscation or war destruction, rational players will live in isolated wilderness claims instead.

**Feature shallowness.** A browser with fifty impressive tabs, each used once, will feel less alive than five interconnected systems that continuously produce consequences.

EarthMC's own documentation is useful here because it explicitly lists both map stagnation and the difficulty of tying persistent progression to traditional PvP war as drawbacks. Its maintainers describe conventional war as problematic because PvP can be disproportionately affected by unfair advantages, while its rules devote substantial effort to preventing claim arms, claim blocking and destructive grief. citeturn17search0turn15view1

The resulting HeliCraft principle should be:

> **Complexity is allowed in the simulation, but the player should encounter complexity progressively through situations, not through a mandatory encyclopedia on day one.**

### Feasibility of the two-to-three-month target

The individual technical ideas are overwhelmingly feasible. Paper exposes custom world/chunk generation and population APIs; persistent metadata can be stored on items and world objects; current Paper APIs can present server-defined dialog interfaces to vanilla clients; Velocity supports modern player forwarding; PostGIS provides mature polygon containment and spatial indexing for territorial queries. citeturn8search5turn8search11turn1search4turn1search5turn8search0turn9search0turn9search1

The challenge is **breadth**, not impossibility.

A two-person team can plausibly create a coherent prototype in two to three months if each domain receives a deliberately narrow first implementation. A full version simultaneously containing sophisticated geological generation, private property, arbitrary constitutions, currencies, central banks, market making, shares, order books, courts, evidence, police, wars, World Engine, history, BlueMap-style integration, notifications and polished onboarding is not a realistic three-month software target at production quality.

This does **not** require reducing the vision to “states + `/balance`.” It means building vertical slices.

For example:

> discover resource → site shows private geological record → state wants access → treaty/company acquires rights → mining physically happens → transaction is recorded → history can reference it.

Or:

> state passes PvP law → player is warned upon entry → violation creates immutable evidence → state opens case → judge issues fine → payment is made in state currency → case appears in history.

Those demonstrate HeliCraft much more effectively than implementing twenty disconnected menus.

A useful priority notation throughout this GDD is therefore:

| Label              | Meaning                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| **Core candidate** | Strongly contributes to the defining HeliCraft loop and has a sensible first-version form.           |
| **Narrow V1**      | Valuable, but the first version should support only the minimum coherent mechanism.                  |
| **Experimental**   | Worth building because it tests an important hypothesis, but likely to require rebalance/redesign.   |
| **Later-depth**    | Architecture should permit it, but a sophisticated implementation is dangerous in the first release. |
| **Avoid for now**  | Technically possible but presently conflicts with the core design or population scale.               |

I am deliberately not making the final scope choice for you. Instead, each major system below includes its **player value, technical complexity, design risk, administrative cost, and sensible first-version posture**.

## Player experience, retention loop, and social structure

The player experience should be designed around three overlapping games rather than a single progression track.

The first is still **Minecraft survival**.

The second is **membership in a living world**.

The third is **agency over that world**.

The crucial design mistake would be replacing the first one. A newcomer should still experience Minecraft as Minecraft. HeliCraft becomes increasingly visible as the player accumulates relationships, land, knowledge and ambitions.

### The core loop

The most useful final form of the core loop is:

> **Observe change → choose an interest → coordinate → act physically → create a persistent consequence → world and website remember it → that consequence changes future possibilities.**

Not every activity needs to traverse every step.

A player mining for an hour can simply mine.

But the _HeliCraft-specific_ loops should usually terminate in persistent state.

Consider resource exploration:

> player explores → performs geological survey → learns something another person may not know → keeps/sells/shares information → company/state acts on it → mining or diplomacy changes economic relationships.

Consider politics:

> citizens dislike a policy → political procedure starts → decision is taken through the state constitution → machine-readable rule changes → behaviour inside a real polygon changes.

Consider an institution:

> government decides to create central bank → constructs bank → administration ratifies functional building → capability becomes available → currency policy creates new economic relationships.

Consider crime:

> actor knowingly crosses closed border → event is recorded → state reacts → warrant/case exists → player interaction creates a consequence.

These are good loops because they do not end at “number +1.”

### What a normal veteran evening looks like

A veteran logs in with max equipment and no need for diamonds.

The web home screen says:

**Since your last visit:** Aurora changed foreign-land ownership law; your company received a purchase offer; an unknown mineral anomaly was reported by another company; a court case involving your state concluded.

**Active now:** a surveying expedition; an upcoming council vote; a contract requiring materials; a diplomatic proposal awaiting ratification.

**Your world:** your company, citizenships, owned properties, cases, offices and subscriptions.

The veteran may ignore all of it and build.

But crucially, the server did not ask:

> “What arbitrary Minecraft objective can we give you?”

It said:

> “Other people and the world changed. Here are the new circumstances.”

That is an excellent retention target because it produces curiosity rather than chore pressure.

### Player archetypes

Do not attempt to create a separate progression tree for every personality. Instead, create **roles that emerge from the same systems**.

| Player tendency      | Natural HeliCraft role                           | Systems that matter                    |
| -------------------- | ------------------------------------------------ | -------------------------------------- |
| Builder              | architect, public contractor, settlement founder | land, institutions, projects, history  |
| Explorer             | surveyor, cartographer, prospector               | geology, private information, frontier |
| Merchant             | trader, market maker, importer                   | currencies, order book, companies      |
| Organizer            | mayor, minister, company director                | governance, organizations, projects    |
| Politician           | monarch, president, MP, opposition               | constitutions, law, diplomacy          |
| PvP player           | police, security, soldier                        | warrants, consensual war               |
| Casual/social player | citizen, resident, worker                        | state life, community, events          |
| Independent player   | homesteader, freelancer                          | wilderness property, contracts, trade  |

The important point is that these are **affordances, not classes**. A player can change role without respeccing.

### Social dependency without social coercion

CivMC's Realistic Biomes explicitly tries to prevent one person from producing everything locally, thereby encouraging expansion and trade. This demonstrates that geographical constraints can successfully be used to manufacture social dependency, but CivMC does so aggressively enough that some crops can take many real-world hours to grow depending on biome. That is much stronger friction than fits HeliCraft's stated philosophy. citeturn15view5

HeliCraft should therefore target:

> **“The other person is the attractive solution,” not “the other person is the only permitted solution.”**

A solitary player should normally be able to survive.

They should not efficiently operate a sophisticated state, exploit every resource specialization, maintain multiple liquid currency markets and complete huge public projects alone.

That difference is essential.

### Introverts and the social endgame

Your own observation—that you are introverted but still value the social game—is important. Do not interpret “social server” as “voice chat required.”

The system can create **asynchronous sociality**:

A player leaves an order on the market.

Another accepts it twelve hours later.

A state proposes citizenship through the website.

An explorer sells survey data without a meeting.

Citizens vote over a 24-hour period.

A builder receives a public commission.

A judge reviews a case after the parties have logged off.

The history feed lets players observe society without actively participating in every conversation.

This may be one of the biggest advantages of the website. Eco provides an instructive precedent: its elections and government systems use a web interface, and its government model explicitly recognizes that players have real lives and that small game societies behave differently from real-world states. citeturn15view3

### New-player onboarding

The correct onboarding solution is neither “spawn completely randomly” nor “force the player into the capital.”

I recommend a tiny **neutral Arrival jurisdiction**, conceptually closer to an immigration desk than a traditional giant spawn hub.

It exists only to:

- explain that the world contains player jurisdictions;
- link the Minecraft account to the website;
- show several state residency offers;
- offer “remain independent” as a first-class option;
- let the player choose a safe wilderness arrival region if they want independence.

It should have no meaningful economy and no reason for veterans to idle there.

On the website, each state can publish a concise “residency card”:

> Aurora  
> Government: Constitutional monarchy  
> PvP: prohibited  
> Foreign property: permitted with registration  
> Tax: 4% market transaction tax  
> Language: RU  
> New-player housing: available  
> Online citizens this week: 4

The player sees the **high-impact laws before consenting**.

States may make offers, but should not spam invitations automatically.

Community warmth genuinely matters here. Current survival-community advertisements repeatedly emphasize players greeting and helping newcomers, and social-retention research broadly supports the importance of social attachment. The system should facilitate that human welcome, not replace it with a tutorial bot. citeturn14search2turn16view0

### Tone and “seriousness”

Do not enforce “realistic role-play.”

Require **public-world appropriateness**, not seriousness.

A joke monarchy should be valid.

A dictatorship run from a castle should be valid.

A communist commune should be valid.

A corporation masquerading as a state should be valid.

What should be moderated are names, symbols and public text that violate server safety/tone rules—especially because your community includes minors.

A useful precedent is EarthMC's separation between geopolitical freedom and explicit naming/content rules; its public rules forbid sexual/inappropriate names and enforce separate behavioural safeguards. Minecraft's own Community Standards likewise prioritize safety around harassment, hate, sexual solicitation and related conduct. citeturn15view1turn18search4

So the answer to the earlier intentionally provocative `Gay Sex Republic` example should not depend on whether administrators find it “unrealistic.” It should depend on a clear all-ages public-naming policy. “Gay Republic” is a political identity; an explicitly sexual public state name is a separate moderation issue. This avoids arbitrary RP policing.

### Events and World activity cadence

Do not make an event every day.

For a ten-player server, an effective rhythm is likely closer to:

**Continuous:** player-driven state/company/legal/economic actions.

**Several times per week:** automated news-worthy events generated from real player activity.

**Every one to three weeks:** authored opportunity/event.

**Occasionally:** major server-wide event such as new region, international summit, election, exposition, discovery or war.

This is a design recommendation rather than a research-derived frequency. The purpose is to keep authored work special and avoid turning World Engine into a task dispenser.

A very strong anti-FOMO rule should be:

> **An event may change the world, but absence should usually cost a player an opportunity rather than destroy existing progress.**

### Community versus advertising

Reddit/social advertising should not advertise HeliCraft as “100 features.”

The strongest recruitment material will be stories.

For example:

> “One player discovered a huge copper deposit inside another country's planned expansion. Instead of a plugin automatically assigning it, the discovery became private information; two states negotiated mining rights; a company was founded to exploit it; its shares are now held by citizens of both states.”

That communicates the product more effectively than:

> `CUSTOM ECONOMY | NATIONS | STOCK MARKET | CLAIMS | EVENTS`.

Your greatest acquisition challenge after launch will probably be showing that these systems are _actually used_. A screenshot of an empty stock exchange is actively harmful marketing.

## World design, resource geography, dimensions, property, and Frontier

Resource geography is one of the highest-potential systems in the entire concept, but your current statement that **all resources must be geographically meaningful** collides directly with vanilla Minecraft's renewable-resource systems.

This is not a minor balancing issue. It is a structural design constraint.

### Rich geological deposits

Your intended model is strong:

> normal geology contains low background quantities; server-generated rich lodes contain orders of magnitude more material; deposits are finite because they consist of real blocks; discovery information is not globally revealed.

That preserves several desirable properties:

- actual mining remains Minecraft gameplay;
- no custom ore block is necessary;
- ownership of information matters;
- deposits eventually deplete;
- territory can have objective economic value;
- no regeneration timer makes the world feel fake;
- a prospector can become socially/economically valuable.

Paper supports custom chunk generation and block-population hooks suitable for world features that cross chunk boundaries, so this is technically feasible entirely server-side. citeturn8search5turn8search11turn8search16

### Generation model

Do **not** derive deposit locations directly from the public Minecraft seed.

Use a separate secret geological seed/key.

World terrain and biome can influence deposit probability, but exact deposit geometry comes from your own generator.

Conceptually:

```text
Minecraft biome/geology
        ↓
regional deposit probability
        +
server secret geological seed
        ↓
deposit bodies
        ↓
ore placement during chunk generation
        ↓
deposit metadata in HeliCraft database
```

A deposit can be represented independently of blocks as something like:

```text
Deposit
id
resource_type
center_x/y/z
geometry_parameters
estimated_original_mass
generation_seed
discovered_by
discovery_timestamp
status
```

The database does not need to track every ore block.

The actual blocks remain the authoritative remaining physical resource.

### Exploration tool

The first survey tool should be simple enough to use without a resource pack.

Paper's Persistent Data Container can attach custom server data to ordinary vanilla `ItemStack`s, making a compass, brush, spyglass or other vanilla object function as a HeliCraft survey instrument without a client mod. citeturn1search4

A scan should **not return exact coordinates**.

That would convert exploration into:

> fly → click → follow waypoint → mine.

Instead, right-click could perform a short active scan and return a geological observation such as:

```text
Geological Survey — Sample 1831
Location: X 2180 / Z -941

Iron anomaly: STRONG
Copper anomaly: MODERATE
Gold anomaly: none detected

Likely source:
south-east / deep

Confidence: 61%
```

Taking several geographically separated samples improves confidence.

Eventually:

```text
Probable copper lode detected
Estimated grade: Very High
Estimated center: within ~130 blocks
Depth: 10–45 below sample elevation
```

The player still has to physically find the vein.

### Why the survey data should remain private

This is one of your best instincts.

Automatic publication would turn exploration into communal map completion.

Private discovery produces an **information economy**.

A player can:

- keep the data;
- share it with their state;
- sell it;
- license it to a company;
- reveal part of it;
- publish it to attract settlers;
- bluff about it socially, while the authoritative survey record itself remains tamper-resistant.

The website should therefore support ownership/access rules on geological records.

A survey result might belong to:

`player`

and be shared with:

`company:HeliaMining`

but _not_ automatically with:

`state:Helia`.

That distinction gives companies and independent explorers actual identity.

### The hyperactive explorer problem

Do not solve this with arbitrary daily scanning energy.

The hyperactive player finding more deposits because they actually explored more is not automatically bad.

The better safeguards are:

- deposits numerous enough that one discovery does not solve the world;
- information private by default;
- coarse scans instead of exact waypoints;
- actual physical extraction still expensive;
- deposits distributed through three dimensions rather than only X/Z;
- new exploration information remains commercially useful even if one player becomes a professional prospector.

In other words:

> **convert hyperactivity into specialization, rather than rate-limiting it into frustration.**

### The severe conflict with vanilla farms

Iron geology becomes economically weak once players operate high-output iron farms. Minecraft's current mechanics allow constructed iron-golem farms to produce iron continuously while loaded, and typical optimized Java designs can produce hundreds of ingots per hour. Gold is similarly renewable through zombified-piglin farms, with extremely high-output designs possible. citeturn11search1turn11search2turn11search14

Villagers create another bypass. Diamond itself remains nonrenewable, but diamond tools and armor are renewably obtainable through toolsmiths, weaponsmiths and armorers; villagers can also make many other otherwise scarce outputs renewable or cheaply accessible. citeturn12search1turn12search2turn12search5

Therefore these three design goals cannot all simultaneously be absolute:

> all major resources are geographically strategic;

> vanilla farms/trading remain fully unchanged;

> resource trade stays economically relevant in mature endgame.

At least one must bend.

### Recommended farm policy

I strongly recommend **transparent selective rebalance**, not invisible nerfs.

Secretly lowering farms so players “do not notice” is dangerous. Experienced Minecraft players will notice, then assume the server is unreliable.

A better principle is:

> **Preserve vanilla contraptions unless they directly erase a major HeliCraft system; where intervention is necessary, document the exception clearly.**

Resource classes should be handled separately.

| Resource channel         | Suggested treatment                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Diamond / ancient debris | Geology can remain strongly important.                                                                                     |
| Coal / redstone / lapis  | Geological specialization works naturally.                                                                                 |
| Copper                   | Geography useful, but mob-based renewability must be considered.                                                           |
| Iron                     | Major conflict with iron farms; needs explicit design decision.                                                            |
| Gold                     | Major conflict with Nether farms; needs explicit design decision.                                                          |
| Emeralds                 | Treat primarily as vanilla villager commodity, not national money.                                                         |
| Building blocks          | Mostly preserve vanilla abundance; only selected materials need regionality.                                               |
| Crops / wood             | Avoid severe geographic locks in V1; CivMC shows they can force trade, but that is much more intrusive. citeturn15view5 |

One promising compromise is to let renewable farms produce enough for **personal convenience**, while geological deposits remain the attractive source for **bulk organizational demand**.

That still requires some rate reduction for iron/gold farms if the server ever creates large demand, but it avoids completely eliminating technical Minecraft gameplay.

Do not balance this before measuring your actual existing audience.

Instrument the test server first:

```text
iron mined from ore
iron produced from golems
gold mined
gold produced from mobs
diamonds mined
diamond gear acquired by villagers
resources transferred through market
```

Then decide.

### Villagers

I would initially preserve villagers except for exploits or trades that completely destroy a tested economy.

Removing diamond-equipment trades on day one is a high-friction change to familiar Minecraft gameplay.

More importantly, HeliCraft's economy should not depend on selling diamond chestplates. National currencies, land, surveying data, institutions and political services can remain valuable even if player equipment becomes abundant.

That is strategically important:

> **Do not demand permanent scarcity from a game fundamentally designed to let players become rich.**

Your deeper economy should increasingly trade _agency and convenience_, not only survival items.

### World size

A finite starting border around or below your proposed ~10,000-block scale is compatible with meaningful geography, but the exact size should be determined from **player density and deposit distribution**, not aesthetic preference.

A huge empty map with ten players destroys interaction.

A tiny map creates territorial claustrophobia.

The right measurement is not just area:

```text
Median distance between active homes
Median distance state ↔ state
Percentage of reachable land under jurisdiction
Number of undiscovered deposits
Travel time to useful wilderness
Number of uncontested settlement-sized regions
```

The map can expand later if those metrics show saturation.

### Frontier: revised verdict

Your skepticism is justified.

**“We opened another ring of terrain with more iron” is not a compelling recurring endgame mechanic.**

EarthMC itself acknowledges that long-lived popular areas can become geographically static and difficult to claim. That supports Frontier as a long-term pressure valve, but does not prove that simply opening new chunks is intrinsically fun. citeturn17search0

I would therefore demote Frontier from **core loop** to **rare world epoch**.

Frontier becomes useful only when it changes the political possibility space.

A good Frontier opening might mean:

> a genuinely significant new landmass becomes reachable;

> its geology is unknown;

> sovereignty is temporarily disallowed during a short exploration phase;

> players can discover resources and candidate settlements;

> after that phase, claims may be proposed;

> competing claims create negotiation;

> new states or colonies can form;

> the event permanently changes world geography.

That is a historical event.

It is not a content treadmill.

I would **not schedule it every three months**. Open one when the world actually needs it.

**Player value:** medium normally, very high as rare historical event.  
**Technical complexity:** medium.  
**Design risk:** high if treated as recurring content.  
**Admin load:** medium during opening.  
**Posture:** **Later-depth / rare authored event**, not foundational V1 retention.

### Migration from the existing HeliCraft world

This is a difficult technical problem.

Custom generation naturally affects chunks when they are generated. Retrofitting rich ore bodies into already-generated areas can put ores inside excavations, structures or player builds unless you can reliably classify untouched terrain. This is an inference from the chunk-generation lifecycle exposed by Paper's generator/populator APIs. citeturn8search5turn8search11

Do not rewrite established chunks blindly.

Safer options are:

**Legacy Core.** Existing developed area remains old geology. Unexplored/new chunks use HeliCraft geology.

**Verified retrofit.** Only administrator-verified untouched regions are regenerated/retrofitted.

**Expansion transition.** Geological system debuts in a controlled outer expansion. This gives Frontier an immediate migration purpose, though it should not become the long-term reason Frontier exists.

The first option is technically safest.

### Jurisdiction is not property

This should become a non-negotiable architectural principle.

A state polygon answers:

> **Whose law applies here?**

A property claim answers:

> **Who may alter/interact with this physical object/land?**

A land title may answer:

> **Who legally owns this parcel?**

Those are not necessarily the same relation.

EarthMC's very detailed rules against claim blocking and claim arms illustrate what happens when territorial geometry itself becomes a tactical resource. Separating sovereignty from physical protection gives HeliCraft much more room to represent annexation, enclaves, foreign property and public land without turning protection claims into geopolitical weapons. citeturn15view1

I would model three layers:

```text
JURISDICTION
state law applies

        ↓ overlaps

PARCEL / TITLE
legal owner according to state/wilderness system

        ↓ controls

PROTECTION ACL
who may break, place, open, use
```

For an independent wilderness home, parcel and protection can effectively be the same thing.

Inside a state, they can differ.

### Private claims

Your “eternal” principle is compatible with persistent-world identity, but it needs one operational escape hatch for abuse and abandoned junk.

An old player's meaningful house can remain protected indefinitely.

A 3000-block claim corridor created only to block others should not gain metaphysical immortality.

So the rule should be:

> **Legitimate registered property does not decay because the player is offline. Administrative anti-abuse action remains possible under published rules and an appeal process.**

Hard protection should initially cover:

- block breaking/placing;
- containers;
- functional blocks;
- doors/trapdoors optionally by ACL;
- entity damage where relevant;
- vehicle interaction;
- redstone interaction where technically reasonable.

Do not try to implement every exotic Minecraft interaction in the first iteration. Log denied actions and discover edge cases through actual play.

### Annexation and existing property

Your rule that a new state cannot simply draw a polygon around an independent owner's property without consent is excellent.

The expansion system should detect overlapping independent titles and require explicit signatures.

For example:

```text
Aurora Territorial Expansion #41

New area: 192,000 m²

Affected independent parcels:
- Maksim Homestead
- NorthMine Depot

Required consent:
Maksim ✓
PlayerB pending

State ratification:
✓

Admin ratification:
pending
```

That turns annexation into politics rather than cartographic theft.

### Expropriation after joining a jurisdiction

Once property is voluntarily within a state's jurisdiction, a state may legitimately want expropriation powers.

But because property is one of HeliCraft's “sacred” investments, I recommend a machine-readable **expropriation procedure**, not a magic ruler permission.

Possible process:

> law allowing expropriation exists before proceeding;

> authorized office issues order;

> reason is public;

> owner receives notice;

> constitution determines approval process;

> title transfer occurs after delay/decision;

> physical build is never deleted by the system;

> record remains permanent;

> appeal is possible only under whatever state/server jurisdiction applies.

A dictatorship can still expropriate aggressively.

It just has to do so through the rules it publicly established.

That difference is important for trust.

### Nether

The Nether is not a problem you need to “fix” completely.

Minecraft intentionally scales horizontal travel at roughly 1:8 between Nether and Overworld, so a 7,000-block Overworld trip can correspond to only 875 Nether blocks. citeturn11search4

That destroys geography **if geography means travel time**.

But HeliCraft's geography does not need to mean travel time.

It primarily means:

- resource location;
- jurisdiction;
- property;
- settlement;
- political control.

I would therefore **preserve vanilla portals**.

CivMC goes much further and disables ordinary obsidian Nether portals in favor of fixed gateways, demonstrating that restricting Nether transit is technically/gameplay possible, but that intervention is much more hostile to your “work with vanilla” principle. citeturn15view4

Recommended first model:

> **Nether = international commons/transit dimension.**

States do not claim Nether sovereignty in V1.

Private installations can still be protected.

A player emerging from a Nether portal into Aurora is treated exactly like any other player crossing Aurora's border: jurisdiction entry occurs at the Overworld destination.

Thus the Nether can bypass a checkpoint, but **not the law**.

A closed border remains closed in legal terms.

This also creates smuggling gameplay without creating magical walls.

For resource generation, Nether-exclusive resources can later receive their own geological distribution, but I would not combine Nether territorial politics with the first implementation.

### End

Treat the End similarly as an **international commons** initially.

Do not force sovereign claims onto every dimension just because the data model allows it.

The End's important gameplay—dragon, cities, elytra, shulkers—is already powerful enough.

**World/geology system overall:**  
**Player value:** very high.  
**Technical complexity:** very high.  
**Design risk:** high because farms can invalidate it.  
**Admin load:** low after generation, medium for territorial disputes.  
**Posture:** **Core candidate / Experimental.** It is worth testing early because it is one of the few systems capable of giving physical geography real economic meaning.

## States, governance, laws, institutions, crime, and war

The state system should be deep, but its depth should come from **composable primitives**, not dozens of hard-coded country types.

Eco provides a valuable precedent here. Its constitution determines political procedures, elected titles carry specific permissions, laws can be expressed as machine-readable “if X then Y” rules, districts scope rules geographically, and voting is performed through its web interface. Eco also explicitly supports the conceptual possibility of democracy, autocracy, oligarchy and monarchy. citeturn15view3

HeliCraft should borrow the _architecture_, not Eco's exact rules.

### Founding a state

One player should be able to found a state.

Requiring three people merely creates fake founding members on a small server.

Founding should require:

1. an existing player account in good standing;
2. no conflicting sovereignty over the proposed capital;
3. a physical **Town Hall / Government House**;
4. an initial constitution;
5. a proposed initial polygon;
6. consent from independent property owners enclosed by that polygon;
7. administrator ratification.

The building requirement is deliberately modest.

The administrator is not deciding:

> “Is this architecture beautiful enough to be a country?”

They verify:

> it is an intentional, usable build;

> the required functional anchors exist;

> territory is plausible;

> no property was silently swallowed;

> the proposal is not an obvious abuse.

The founding event then becomes permanent history.

### State lifecycle

Use explicit state statuses:

```text
PROPOSED
ACTIVE
DORMANT
SUCCESSION
DISSOLVING
DISSOLVED
ANNEXED
```

Do not automatically delete a state because its leader missed a week.

Dormancy should be a social condition, not data destruction.

A likely process after prolonged inactivity is:

> leadership succession mechanism triggers;

> if it fails, state becomes dormant;

> citizens/admin council can initiate revival, succession, merger or controlled dissolution;

> borders and properties remain frozen until resolved.

The exact inactivity periods should be tuned empirically rather than hard-coded as a philosophical truth.

### Government should be built from primitives

Do not implement:

```text
if monarchy:
   ...
else if democracy:
   ...
else if dictatorship:
   ...
```

That architecture will collapse the moment someone asks for an elective monarchy or a dictator constrained by a council.

Instead define:

**Offices:** ruler, minister, judge, police, legislator, treasurer, custom office.

**Appointment methods:** founder appointment, office appointment, citizen election, council vote, hereditary succession, referendum.

**Procedures:** proposal, seconding, voting, quorum, threshold, veto, ratification.

**Permissions:** issue currency, propose law, approve law, sign treaty, draw territory, appoint office, issue warrant, spend treasury.

Then offer templates:

> Constitutional Democracy  
> Absolute Monarchy  
> Council Republic  
> Autocracy

A template simply preconfigures primitives.

This gives casual founders a usable starting point while allowing political enthusiasts to build strange systems.

**Player value:** very high for state-oriented players.  
**Technical complexity:** high.  
**Design risk:** medium if templates are good, extreme if everything begins as blank configuration.  
**Admin load:** low-to-medium.  
**Posture:** **Core candidate, but with a constrained primitive set first.**

### Constitution model

Every state has two constitutional layers.

**Machine-readable constitution:** offices, powers, election/succession procedure, voting requirements.

**Free-form constitution:** ideology, rights, traditions, clauses the system does not understand.

Every amendment creates a version.

Never rewrite history.

If Aurora was called Aurora Kingdom in October and Aurora Republic in December, an October event should continue displaying:

> Aurora Kingdom

while linking to the current state entity.

This is the correct solution to your question about renamed historical entities.

### Citizenship

Citizenship should be an explicit state-recognized relationship.

Dual citizenship should be technically supported, while states can prohibit or restrict it through law.

This is superior to globally banning it because dual citizenship itself creates interesting diplomacy.

Possible statuses:

```text
Citizen
Resident
Foreign resident
Visitor
Banned / persona non grata
Diplomatic
```

Avoid making all of these mandatory immediately.

Citizenship can initially be `citizen / non-citizen`, with richer residency later.

### State law hierarchy

Your three-layer model is exactly right and should be formalized.

**Server law / safety layer**

Cannot be overridden by any state.

Examples:

- cheating;
- alt accounts;
- harassment;
- doxxing;
- destructive exploit abuse;
- real-money trading forbidden by server policy;
- intentionally causing severe lag;
- whatever claim-grief protection HeliCraft chooses.

Violations are handled by HeliCraft administration.

**Machine-readable state law**

Server understands the event and jurisdiction.

Examples:

- PvP legality;
- border entry;
- persona non grata;
- certain taxes;
- company licensing;
- foreign land ownership;
- perhaps theft if the underlying container/property mechanics allow it to occur safely.

The action may remain physically possible.

The server records evidence.

**Free-form state law**

Published text with no automatic mechanical interpretation.

Examples:

- architectural code;
- dress requirements during ceremonies;
- political speech rules within the state's RP;
- complicated commercial obligations;
- obscure constitutional doctrines.

The state handles them socially/judicially.

Eco's “if X then Y” law model is strong evidence that machine-readable civic law works best when the engine recognizes explicit event types, actors and consequences rather than trying to understand arbitrary prose. citeturn15view3

### The most important law UX rule

**No meaningful machine-readable offence without advance notice.**

On border crossing:

```text
Entering AURORA

Restricted border
PvP prohibited
Foreign land ownership requires permit

You are not authorized to enter.
Turn back within 10 seconds to avoid an illegal-entry record.

[Open laws]
```

Paper's newer dialog facilities can support richer confirmation/input interfaces while still using a vanilla client, although basic titles/actionbar/chat should remain fallback-friendly if you want version portability. citeturn1search5

The grace period matters.

Walking three blocks over an invisible polygon should not make a newcomer a criminal.

### Evidence

Evidence should be **facts, not verdicts**.

The server records:

```text
Event #39182

type: PLAYER_DAMAGE
actor: PlayerA
target: PlayerB
timestamp
coordinates
jurisdiction_id
weapon/item
damage
prior_recent_damage_relationship
law_version_id
```

Another event records the response.

The court decides whether it was self-defense.

This is much better than making the plugin an automatic judge.

Evidence relevant to cases could include:

- border enter/exit;
- PvP hits;
- kills;
- death;
- custody attempt;
- custody established;
- disconnect during custody;
- selected economic transfers;
- property interaction where intentionally logged;
- warrant status.

Do **not** log every player movement or block interaction forever. That creates an unnecessary data and privacy burden.

### Non-retroactivity

Every evidence event should reference the law version applicable at the time.

A new government cannot pass:

> “Yesterday's action is illegal”

and mechanically prosecute it under the new law.

This should be guaranteed by architecture rather than goodwill.

### Cases and courts

A case object should look roughly like:

```text
Case #AUR-104

Jurisdiction: Aurora
Court: Supreme Court of Aurora

Plaintiff / prosecutor
Defendant
Charges
Evidence references
Judge(s)
Status

Filed
Accepted
Hearing
Verdict
Appeal
Closed
```

Do not create a Phoenix Wright minigame unless the players want one.

The court UI primarily organizes human judgment.

A small monarchy may let the king judge personally.

A developed republic may appoint three judges.

The server does not care, provided the constitution grants the relevant permission.

### Punishment

Your instinct to avoid prison is correct.

CivMC is a useful counterexample: its ExilePearl system can banish a defeated player to the Nether until released, explicitly giving communities a mechanism for player-enforced imprisonment. That can create high-stakes politics, but it also makes loss severely affect the victim's ability to play normally. citeturn15view4

HeliCraft's punishment palette should instead focus on **consequences that create future play**:

- fine;
- restitution;
- debt;
- temporary ban from state territory;
- deportation;
- loss of state license;
- loss of citizenship;
- disqualification from state office;
- confiscation of assets held _within that state's legal/economic system_, if its laws allow it;
- public conviction/history record.

Avoid:

- forced idle jail;
- server-wide gameplay disablement for a state-law violation;
- confiscation of unrelated personal Minecraft inventory;
- destruction of the player's home as ordinary punishment.

### Fines

Do not remotely deduct arbitrary money the instant a court writes a verdict.

The state can issue:

```text
Fine: 10,000 AUR
Due: 7 days
```

If the player has AUR accounts legally subject to Aurora, the law may authorize collection.

If not, it becomes a debt.

The consequence can be:

> cannot obtain Aurora company license;

> wanted status;

> cannot buy Aurora land;

> may be detained if entering.

This is more interesting than a magical global debit.

It also answers the `1,000,000 AUR` problem: the state _may_ issue a ridiculous nominal sentence, but HeliCraft does not guarantee that the universe will make it collectible.

### Arrest

The one-click “police baton freezes a player” proposal is thematically fun but mechanically dangerous.

It lets a police role become a sanctioned grief tool.

A stronger design is a **warrant-gated custody interaction**.

Requirements:

- actor has police authority from constitution;
- target has an active arrestable warrant;
- both are inside the relevant jurisdiction, unless treaty says otherwise;
- officer is within close distance;
- officer performs an uninterrupted short restraint action;
- target receives a very visible warning.

For example:

```text
Officer Maksim is attempting to detain you
Warrant AUR-31: Illegal border entry

[Submit]
[Resist]
```

If the player submits, custody starts immediately.

If they resist, the officer can use the restraint tool. It might require staying within two or three blocks for several seconds rather than winning conventional PvP.

That gives positioning/teamwork relevance without making the best crystal-PvP player above the law.

While in custody:

- severe movement limitation, not total inability to act;
- no item transfer/drop exploits;
- a short escort window;
- destination is a police station;
- police cannot hold the player indefinitely.

At the police station, punishment processing occurs.

The station therefore has a real physical function.

**Technical complexity:** high.  
**Abuse risk:** very high.  
**Player value:** potentially very high because it converts law into real multiplayer interaction.  
**Admin load:** medium because disputes will happen.  
**Posture:** **Experimental / Narrow V1.**

### Combat logout and custody logout

Do not solve this with a server ban.

Record it.

If someone disconnects during active custody:

```text
CUSTODY_EVASION
```

The court can treat that as a separate event if local law recognizes it.

During mutually agreed war, combat logout can be covered by the war contract and may count as a defeat for the relevant objective.

Avoid elaborate fake-player NPC combat logging in the first implementation. It adds large technical complexity to a rare edge case.

### Police station

This is one of the strongest institutional-building candidates because its physical purpose is obvious.

Required functional anchors might include:

- public entrance;
- processing desk;
- evidence terminal/block;
- custody processing location;
- government-defined police spawn/meeting area.

A prison cell can exist architecturally but should not imply the system forces someone to stare at a wall for an hour.

### Institutional buildings

Your revised institution concept is stronger than the old “emerging institution unlock” model.

The state decides:

> “We create the Central Bank of Aurora.”

The state passes the appropriate act/constitutional action.

Players build it.

Administrators verify the physical representation.

The system activates it.

That preserves agency while requiring political abstractions to inhabit Minecraft.

Eco again provides a useful precedent: constitutions, elections and laws are associated with physical government objects/buildings while their interaction crosses into a web interface. citeturn15view3

### Institution model

Every recognized institution should have:

```text
Institution
type
legal_owner
jurisdiction
building_region
required_anchors[]
status
office_permissions[]
history
```

Useful statuses:

```text
PROPOSED
ACTIVE
DEGRADED
SUSPENDED
RELOCATING
DESTROYED
```

If a required functional anchor is broken:

> institution becomes DEGRADED.

Do not instantly erase its currency or delete court cases.

Disable **irreversible institutional actions** until repaired.

For example, a damaged central bank may prevent new currency issuance or policy changes while existing balances continue to exist.

That creates meaningful physical vulnerability without catastrophic database destruction.

### Institution validation

Do not calculate an architectural score.

Administrators check a small checklist.

For example Central Bank:

- dedicated registered region;
- intentionally constructed building;
- treasury/vault functional anchor;
- policy desk/terminal anchor;
- public service point;
- no obviously fake one-minute construction.

The wording “reasonable building” is inherently subjective.

That is acceptable because this event is rare and because you explicitly accept human ratification.

The key protection is **auditability**.

```text
Institution proposal #82
Reviewed by Admin A, Admin B
Approved 2026-11-17
Reason: functional requirements met
```

### Recommended institution taxonomy

I would not make Parliament and Government two mandatory institutions.

A compact first taxonomy is:

| Institution                      | Mechanical role                                                    | Design verdict                                            |
| -------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| **Government House / Town Hall** | state foundation, constitutional acts, territorial proposals       | Core candidate                                            |
| **Court**                        | cases, verdicts, warrants/appeals                                  | Core candidate                                            |
| **Police Station**               | custody processing, warrants                                       | Experimental but strong                                   |
| **Central Bank / Mint**          | state currency issuance, monetary statistics, optional FX facility | Core if national currency is core                         |
| **Exchange / Market Hall**       | market governance; optional future securities market               | Narrow V1                                                 |
| **Parliament**                   | physical seat of legislative procedure                             | Optional subtype/role of Government, not mandatory system |
| **Embassy**                      | treaties/diplomatic presence                                       | Later-depth                                               |
| **Land Registry**                | property/title management                                          | Could remain web function initially                       |

A monarchy can call Government House “Royal Palace.”

A republic can call it “Parliament.”

Mechanics should not force architectural vocabulary.

### Destruction of institutions

Institution destruction should be possible only under one of three conditions:

- owner intentionally changes it;
- owner allows normal building modifications that accidentally invalidate it;
- an explicit consensual-war contract makes that institution attackable.

This is important because otherwise a random griefer can indirectly destroy a state's monetary capability.

War destruction should affect **capability status**, not delete historical/economic records.

Destroyed Central Bank:

> cannot issue new AUR;

> cannot change FX policy;

> reserve bot pauses;

> AUR balances still exist.

Now attacking an institution has strategic meaning without deleting people's money.

### Territorial expansion

Applications should be drawn on the web map.

Automate geometry validation:

- polygon valid;
- no self-intersection;
- maximum vertex count;
- no illegal overlap;
- owner-consent requirements identified;
- optional minimum width heuristics.

Then human ratification.

EarthMC's need for explicit anti-claim-arm and anti-claim-blocking rules shows why purely mechanical land expansion eventually produces adversarial geometry. citeturn15view1

Do not pretend an algorithm can decide geopolitical legitimacy.

### Colonies and enclaves

Support disconnected territory, but make it a deliberate territorial type.

For example:

```text
Core territory
Enclave
Colony / external territory
Lease / concession
```

Require a reason and admin approval for disconnected acquisitions.

Otherwise every resource deposit becomes a tiny sovereign island.

### Territorial transactions

These are highly aligned with the concept.

Treaty actions should support:

```text
Cession
Sale
Lease
Concession
Joint administration
Mining rights
Transit rights
```

Not all require land ownership transfer.

This is where resource geography becomes diplomacy.

### War

Your mutual-consent condition is one of the best decisions in the concept.

EarthMC publicly describes conventional PvP-linked progression as unsustainable for its environment and has historically considered opt-in/non-destructive approaches to war, specifically because PvP advantage and persistent claims create difficult fairness problems. citeturn17search0turn17search1turn17search3

HeliCraft should therefore model war as a **contractual exceptional state**.

Before war begins, both sides ratify:

```text
Participants
Allies
Start time
Maximum duration
Combat zones
Victory conditions
Territorial stakes
Institutions that may be attacked
Private property rules
Inventory/death rules
Mercenary rules
Logout/forfeit rules
Ceasefire procedure
What the system executes on victory
```

Then administrators approve the contract.

This transforms war from:

> “PvP determines who deserves to own everything”

into:

> “Both societies agreed to expose defined stakes to a competitive event.”

### Possible victory conditions

Do not make kills the only victory metric.

War objectives can include:

**Territorial control:** hold agreed physical control points over a defined time.

**Institution capture:** successfully disable/occupy a designated institution.

**Economic:** deliver/pay agreed reparations or achieve a blockade-related objective, though this is harder to automate.

**Political:** force a negotiated surrender; system simply records the signed settlement.

**Hybrid:** score from several objectives.

Since wars are supposed to be extremely rare, you do not need an esports-grade general war engine initially.

The website can provide the contractual and historical infrastructure while administrators supervise the unusual parts.

**Player value:** potentially enormous as a historical event.  
**Technical complexity:** very high if generalized.  
**Design risk:** extreme.  
**Admin load:** high but rare.  
**Posture:** **Later-depth**, with the war-contract data model designed early.

### Unequal states

Do not automatically balance every war.

If five-player Aurora and two-player Helia voluntarily agree to a war, asymmetry is part of their political reality.

But the contract can constrain participation:

> 3v3;

> certain mercenaries;

> limited windows;

> specific objectives.

Because both parties consent, balance becomes part of negotiation.

### Administrators who also play

This is workable for the current community but requires formal conflict-of-interest handling before advertising brings outsiders.

Admins may be citizens and may even lead states.

But:

> an admin should not be the sole ratifier of their own state's border;

> the judge of an appeal against their own moderation action;

> the sole reviewer of a war in which they participate;

> the sole verifier of their state's institution.

Use **recusal + multi-person ratification + public audit log**.

Your idea of an admin council with trusted active players is therefore sensible, but server-safety decisions must remain staff responsibilities.

This is less about pretending administrators are neutral gods and more about making bias _visible and procedurally constrained_.

## Economy, currencies, companies, markets, and financial systems

The economy is simultaneously one of the most exciting aspects of HeliCraft and the area with the greatest danger of spending months developing a beautiful simulation that ten people ignore.

The central design question is not:

> “Can we implement currencies and a stock exchange?”

You can.

It is:

> **What economic relationships become fun specifically because several humans independently control assets, territory, currencies and organizations?**

### Whether HeliCraft needs a central currency

I agree with your instinct that **a universal server fiat currency would weaken the national-currency fantasy**.

If every meaningful price is ultimately in `HC$`, national currencies risk becoming role-play skins.

So I would **not create a centrally issued HeliCraft fiat currency**.

However, this choice has real consequences.

With three state currencies, an order book fragments into multiple denominations.

With `N` currencies there can be up to:

\[
\frac{N(N-1)}{2}
\]

distinct unordered currency pairs before item markets are even considered.

With ten active players, fragmentation is severe.

This is not an argument for abandoning national currencies. It means the UI must explicitly handle thin liquidity.

### Recommended monetary hierarchy

Use three layers:

**Vanilla barter.**

Always possible.

Items can be exchanged directly player-to-player.

**National/private ledger currencies.**

Actual HeliCraft monetary units.

Examples:

`AUR`, `HLR`, company-issued credits if ever permitted.

**Market quoting.**

Every market order chooses a denomination.

There is no magical universal conversion.

A player might see:

```text
IRON

Sell:
64 @ 18 AUR
512 @ 0.7 HLR each

Buy:
320 @ 15 AUR
```

The website can display estimated converted values **only where actual FX quotes exist**.

This preserves monetary sovereignty.

### The unavoidable bootstrapping issue

How does the first AUR enter circulation?

The answer should be wonderfully simple:

> the authorized Central Bank issues it.

No resource-selling NPC is required.

The government can create 100,000 AUR and:

- pay citizens;
- buy resources;
- finance public projects;
- lend;
- exchange it for other assets.

If it prints recklessly, the currency may lose value.

That is player agency.

Virtual-economy research shows that inflation and volatility can meaningfully affect player experience, and long-running virtual economies often require monitoring of currency supply, prices and faucets/sinks. citeturn7academia35turn7search9

### Ledger architecture

Do **not** store balance as a mutable number only.

Use a double-entry ledger.

Conceptually:

```text
Transaction
id
currency
debit_account
credit_account
amount
reason
timestamp
actor
related_entity
```

Every balance is the sum of entries or a cached projection of them.

Accounts may belong to:

- player;
- state treasury;
- company;
- institution;
- escrow;
- market;
- bot reserve.

Currency issuance is a ledger event:

```text
CentralBank:ISSUANCE
   → Aurora Treasury
100,000 AUR
```

Destruction/burning similarly has explicit provenance.

This makes inflation statistics, investigations, reversals and auditing dramatically easier.

### Currency page

Each currency should have a public profile:

```text
AUR — Aurora Crown

Issuer: Central Bank of Aurora
Created: 18 Nov 2026

Total issued: 142,500
Destroyed: 5,000
Circulating supply: 137,500

Active holders, 30d: 8
Transactions, 30d: 91
Transaction volume: 84,220 AUR

Market rates:
AUR / HLR
AUR / Gold

Issuance history
Policy
Reserve balance
```

Avoid claiming a precise “inflation = 7.42%” unless enough repeated transactions exist to build a meaningful price index.

With ten players, a single unusual diamond sale can make a formal CPI absurd.

Better display:

> money supply;

> transaction volume;

> median prices for sufficiently traded products;

> rolling trade-weighted index when sample size supports it.

### Taxes

Taxes should correspond only to actions the server can actually observe.

Strong candidates:

- market transaction tax;
- company registration fee;
- property transfer tax;
- recurring land levy;
- direct citizen levy if constitution permits it;
- import/license fee where technically meaningful.

Avoid an overly realistic tax code.

Eco's government system has several transaction-linked tax categories, demonstrating the usefulness of taxing actions already known to the engine rather than attempting to infer every possible economic activity. citeturn15view3

### Currency demand

National currency becomes meaningful when states demand it for real state functions.

Examples:

> taxes payable in AUR;

> state land auctions in AUR;

> public contracts paid in AUR;

> government salaries in AUR;

> court fines in AUR;

> licenses priced in AUR.

This creates endogenous demand without forcing private players to use AUR everywhere.

A citizen may still barter diamonds.

### Central Bank

The Central Bank is therefore a mechanically legitimate institution.

Capabilities may include:

- currency creation/destruction;
- treasury-account management;
- policy notes;
- reserve management;
- optional FX facility;
- monetary statistics.

It should **not** automatically determine a “correct exchange rate.”

There is no correct rate independent of market behaviour unless the state declares a peg.

### Market maker bots

Your intuition here is also correct: a ten-player continuous market can easily have no counterparty at a particular moment.

The problem is structural.

Mature games such as EVE use persistent buy and sell orders with matching rules, but their functioning depends on vastly greater participant scale. Financial-market research also treats liquidity and market depth as core properties of an exchange, and call-auction research shows that aggregating orders in time can sometimes improve depth/price discovery relative to continuous execution, although results vary by market. citeturn6search1turn13search0turn13search4

That means HeliCraft needs **liquidity design**, not merely an order-book UI.

### Do not give the bot infinite reserves

The following design is fatal:

```text
Central Bank buys unlimited AUR for 1 HC$
Central Bank sells unlimited AUR for 1 HC$
```

It creates a server-guaranteed value and infinite arbitrage liability.

Likewise:

> server constantly replenishes the bot whenever players drain it

means the actual counterparty is an infinite administrator bank.

The bot should have real balance-sheet constraints.

For example:

```text
Aurora FX Facility

Buys AUR:
1 HLR → 1.82 AUR

Sells AUR:
1.95 AUR → 1 HLR

Available HLR reserve: 4,100
Available AUR reserve: 8,450

Max trade/player/day: 500 HLR
```

When HLR reserve reaches zero:

> buying HLR stops.

That is not a failure.

It means the central bank defended an exchange policy until it exhausted reserves.

That is actual economic gameplay.

### Where reserves come from

I would **not continuously fund reserves from the server**.

Better options:

**Initial capitalization:** the institution receives a one-time clearly documented seed grant during early testing.

**State funding:** treasury deposits assets into reserve.

**Market operations:** the bank earns/acquires reserves through trades.

**Exceptional admin recapitalization:** possible during test phase, always visible in ledger/history.

This lets you test market making without pretending server money is economically neutral.

### Arbitrage protection

You said the bots must not be breakable through arbitrage.

This requires an important distinction.

**A player profiting because Aurora intentionally posted a bad exchange rate should be allowed.**

That is market consequence.

**A player creating guaranteed circular profit because several system bots independently quote contradictory prices is a server bug.**

Before publishing system-owned FX quotes, the backend can check the directed rate graph for risk-free cycles after fees.

It can also impose:

- minimum spread;
- finite inventory;
- per-order size;
- per-period flow limit;
- inventory-sensitive quote adjustment;
- atomic execution;
- one authoritative price engine per facility.

Do not implement hidden confiscation after someone finds a valid trade.

### Dynamic exchange rates

Never dynamically alter rates solely because:

> “currency supply increased 10%, therefore price falls 10%.”

That is an artificial simulation pretending to be a market.

If a state wants a floating currency, the **market discovers the rate**.

If it wants a peg, its Central Bank advertises a policy and uses reserves to defend it.

That creates the economic game you actually want.

### Order book

For normal items and currencies, a real limit-order book fits the website extremely well.

Order:

```text
SELL
256 iron ingots
minimum 16.5 AUR each
expires in 7 days
```

Inventory or money should be escrowed at submission.

Otherwise every fill requires hoping the seller still owns the items.

Minecraft interaction can be:

> put sell items into Market Deposit container / commandless terminal;

or:

> website order reserves items already placed in a designated market chest.

A simpler implementation is an in-game market deposit menu tied to website inventory.

Do not attempt to manipulate arbitrary offline player inventories from web operations unless you are extremely confident in consistency handling.

### Physical Exchange / Market Hall

Frequent market browsing should remain available from the website.

Do not force players to fly to the exchange for every order.

The physical building can instead handle rare actions:

- register exchange;
- change market policy;
- list a new securities class;
- hold opening auction;
- perform corporate IPO ceremony.

This follows your good rule:

> routine = convenient;  
> important/ceremonial = physical.

### Thin markets: batch auctions are worth considering

For frequently traded commodities, continuous matching is fine.

For **company shares**, where one transaction per week may be realistic, continuous order books create depressing screens such as:

```text
BUY —
SELL 100 @ 5000 AUR
last trade 19 days ago
```

A periodic call/batch auction may fit better.

Orders accumulate until, for example, Sunday 20:00.

The system computes a clearing price that maximizes executable volume.

This concentrates thin demand in time.

Call-auction research finds real trade-offs rather than universal superiority, but multiple studies show that periodic aggregation can increase depth or improve certain price-discovery/liquidity properties in some environments. citeturn13search0turn13search4turn13search5

For HeliCraft's microscopic securities market, the psychological advantage may be even more important: **“weekly Aurora exchange auction” becomes an event.**

### Companies

Companies deserve to exist before the stock exchange.

A company should support:

```text
Name
Founders
Owners / shares
Directors
Treasury accounts
Property
Employees / roles
Contracts
Licenses
History
```

Shares should initially be **ownership records**, not necessarily liquid securities.

Example:

```text
Helia Mining Ltd.

10,000 issued shares

Maksim: 4,000
Alex: 3,500
Aurora Treasury: 2,000
Public float: 500
```

Transfers can occur directly.

This already enables:

- partnerships;
- acquisitions;
- inheritance/sale;
- cross-state investment;
- control disputes.

### Stock market verdict

This is one area where I would be deliberately conservative despite your personal enthusiasm.

A stock exchange is **thematically excellent but population-sensitive**.

At ten active players, you may have:

- three states;
- four meaningful companies;
- only two people interested in investing;
- one player who already owns most productive assets.

A continuous share market would then be mostly theatre.

So:

**Share ownership registry:** high value, medium complexity, **Core/Narrow V1 candidate**.

**Private share transfers:** high value, low-to-medium additional complexity, **Narrow V1**.

**IPOs:** interesting, medium complexity, **Experimental**.

**Continuous stock order book:** high technical/UI cost relative to likely usage, **Later-depth**.

**Periodic securities auction:** probably the best experiment once there are enough companies, **Experimental**.

This does not kill the dream.

It creates a path by which the exchange appears when there is something worth exchanging.

### Debt, bonds and bankruptcy

Bankruptcy is fascinating but should only exist once legal debt exists.

Otherwise “company bankruptcy” is just:

> balance reached zero.

Later, contracts could support loans:

```text
Principal
Currency
Interest
Due date
Collateral
Default consequence
```

Then insolvency matters.

Until that exists, a company with zero cash can simply receive more investment.

Avoid premature corporate-law simulation.

### Money sinks

A national fiat currency does not require a server sink in exactly the same way a centrally spawned MMO currency does, because the issuer itself controls supply.

States can burn collected taxes if they want contraction.

Or spend them back into the economy.

That decision itself becomes monetary/fiscal policy.

This is more interesting than the traditional Minecraft economy:

> sell cobblestone to NPC → server creates money → pay money to warp fee → server destroys money.

EarthMC's player economy uses gold as currency and explicitly emphasizes player-run exchange rather than admin shops, while virtual-economy research highlights the importance of currency supply and price stability. HeliCraft can go one step further by letting issuers themselves become players in that process. citeturn17search0turn7academia35

### Economic safety floor

Do not protect players from being poor.

Do protect their **ability to play Minecraft**.

A player can have:

```text
0 AUR
0 HLR
company bankrupt
lost political office
outstanding debt
```

and still:

- access their protected home;
- gather vanilla resources;
- craft;
- travel;
- establish a new life;
- barter.

That is the ideal safety floor.

It allows economic failure to matter without turning it into account failure.

## Website, map, World Engine, history, and community layer

The website is probably HeliCraft's strongest differentiator, but only if it is designed as the **second half of an activity loop**, not a control panel.

Eco offers direct proof that a game can move elections, statistical information and governmental procedures into a web interface while keeping the physical world as the place where governmental objects and activities exist. citeturn15view3

HeliCraft can push that relationship considerably further.

### Website information architecture

The main navigation should reflect **world concepts**, not database tables.

A sensible conceptual structure is:

```text
WORLD
Map
What's happening
History

SOCIETY
States
Companies
Institutions
People

ECONOMY
Market
Currencies

YOU
Properties
Organizations
Cases
Discoveries
Notifications
```

Avoid a giant `/dashboard` with thirty widget cards.

### Returning-player homepage

The first three sections should answer three questions.

**What changed?**

```text
Since your last visit
```

**What can I participate in now?**

```text
Active opportunities / events / decisions
```

**What needs my attention?**

```text
Your offices, votes, company matters, contracts, cases
```

This is far more valuable than displaying generic server statistics first.

### Website use should be optional moment-to-moment, not optional structurally

A person should be able to:

> join Minecraft;

> mine;

> build;

> fight mobs;

> chat;

without opening the site.

But serious state/company/economic management can absolutely require the web.

That is not a failure of Minecraft UX.

It is the product.

The key is to ensure that Minecraft communicates enough context to prevent confusion.

Example:

```text
You entered Aurora.
PvP prohibited.
Detailed laws: helicraft/.../aurora/laws
```

### Map

The website map should combine two representations.

**Physical map**

Terrain, buildings, possibly players.

**Semantic overlays**

- state jurisdiction;
- parcels;
- institutions;
- settlements;
- wars/events;
- public landmarks;
- public transport if relevant;
- historical borders;
- eventually public geological data.

Political overlays are technically straightforward with polygon data; similar Minecraft web maps already show claims and player positions, and EarthMC's map exposes visible online players plus claimed land. citeturn17search11

### Resource information must obey access control

Do not render geological discoveries into a globally delivered hidden JSON layer and trust the frontend not to display it.

Access control must happen server-side.

If Maksim owns survey record `GEO-183`, the backend determines whether the requesting user can receive it at all.

This applies equally to:

- private company financial data;
- draft treaties;
- sealed court evidence where permitted;
- internal state decisions.

### Live player location

Showing every player live has real costs.

EarthMC hides players from its map under certain conditions such as sneaking or invisibility, showing that even an established live map needs visibility rules. citeturn17search11

For HeliCraft, I recommend:

**Peacetime:** public player visibility is acceptable if your community prefers it.

**Individual concealment:** a mechanically understandable state such as sneaking/invisibility/role ability may hide the marker.

**War:** map visibility should become symmetrical and explicitly defined by the war contract, not something only one premium role can bypass.

**Police:** do not automatically give police a magical exact GPS marker for every wanted player unless that is an intentional surveillance institution.

A warrant should create a reason to search, not a permanent wallhack.

### Historical map

A particularly powerful website feature would be a time slider:

```text
October 2026
December 2026
March 2027
```

showing state borders and major registered objects at that time.

Do not rebuild historical terrain initially.

Political/history layers are enough.

This is one of those features that becomes exponentially more valuable as the server ages.

### History architecture

Your instinct for maximum automatic history is correct, but **automatic history and edited history should be separate layers**.

Use an immutable event stream:

```text
STATE_FOUNDED
STATE_RENAMED
BORDER_CHANGED
LAW_PASSED
INSTITUTION_CREATED
INSTITUTION_DESTROYED
COMPANY_FOUNDED
CURRENCY_CREATED
WAR_DECLARED
WAR_ENDED
COURT_VERDICT
RESOURCE_DISCOVERED (public only if designated)
```

Then generate readable timeline entries.

An administrator/player with permission can add editorial context:

> “This treaty ended a three-week diplomatic crisis.”

But that text does not mutate the original event.

### Editing history

Never allow an administrator to silently rewrite the factual event.

Support:

```text
Original event
Editorial annotation
Correction
Visibility/moderation action
```

If a state changes its name, old entries preserve the old name at the time.

If a player is banned, their historical actions remain.

If their old profile text contains prohibited material, that text can be hidden while factual participation remains.

This is much closer to how a meaningful historical record should behave.

### Player biography

Profile should emphasize world participation before statistics.

Example:

```text
Maksim

Joined: 2 October 2026

Citizenship:
Aurora, 2026–present

Founder:
HeliCraft Geological Survey Co.

Offices:
Minister of Finance, Nov 2026–Jan 2027

Built:
Central Bank of Aurora

Discoveries:
3 published geological sites

Historical events:
14
```

Statistics can still exist.

They simply do not define progression.

### World Engine: do not build an AI god

The first World Engine should be **boring software with interesting consequences**.

Not:

> LLM continuously reads server logs and invents quests.

Instead:

```text
Domain event stream
       ↓
rules / conditions
       ↓
candidate world event
       ↓
optional admin review
       ↓
published opportunity/news/milestone
       ↓
persistent consequence
```

Example trigger:

```text
WHEN
two states exist
AND no treaty has ever been signed
AND both active in last 14d

THEN
suggest authored "First Diplomatic Summit" opportunity
```

Another:

```text
WHEN
first rich deposit is publicly discovered

THEN
create milestone news item
```

Another:

```text
WHEN
state currency 30d transaction volume exceeds threshold

THEN
notify admins:
"Currency has enough activity for a monetary-history feature/event"
```

Notice that the system does not reward the metric automatically.

It merely creates context.

That dramatically reduces metric farming.

### World Engine event categories

I recommend four.

**News** — describes what happened.

> Aurora ratified a constitution.

**Opportunity** — players can react.

> The administration is accepting proposals for an international exposition.

**Milestone** — historically meaningful state change.

> First national currency created.

**Crisis/complication** — non-destructive problem.

> Central Bank reserves are nearly exhausted.

The last category should derive mostly from actual systems rather than random punishments.

### LLM role

An LLM can safely assist with:

- drafting article text;
- summarizing a week;
- suggesting headline variants;
- generating admin event concepts.

It should not autonomously:

- transfer land;
- issue currency;
- convict players;
- modify laws;
- punish players;
- decide whether a building is legitimate.

All mechanical changes should come from deterministic operations or explicit human approval.

### Notifications

Notifications are useful, including Discord/Telegram/push integrations, but allow granular subscriptions.

Good:

> “A vote in a state where you are a citizen closes tomorrow.”

> “Someone placed a buy order against your company.”

> “A case naming you was filed.”

Bad:

> “YOU HAVEN'T PLAYED FOR THREE DAYS 😱.”

The first is world communication.

The second is retention manipulation.

### Physical memorials

Do not invent a separate memorial mechanic immediately.

The landmark/history system can naturally support it later.

A physical location can have:

```text
Historical significance:
Site of the First Aurora–Helia Treaty

[View history]
```

That is enough to let memorial culture emerge organically.

### World Engine overall verdict

**Player value:** high if driven by real state; low if it becomes generic quests.  
**Technical complexity:** medium for event framework, extreme for autonomous simulation.  
**Design risk:** medium.  
**Admin load:** low-to-medium once tooling exists.  
**Posture:** **Core candidate as event/rule/history infrastructure; AI autonomy is Later-depth.**

## Technical architecture and implementation model

A clean architecture matters unusually strongly here because almost every important HeliCraft action crosses Minecraft ↔ backend ↔ web.

Do not build the plugin as a giant monolith that owns the canonical database and expose its internals to the website.

The authoritative application should be a domain backend.

### Recommended architecture

```text
                          ┌────────────────────┐
                          │      Website       │
                          │ React/Next/etc.    │
                          └─────────┬──────────┘
                                    │ HTTPS / WS
                                    ▼
┌───────────┐             ┌────────────────────┐
│ Velocity  │             │   HeliCraft API    │
│  Proxy    │             │                    │
└─────┬─────┘             │ auth / states      │
      │                   │ economy / laws     │
      ▼                   │ history / map      │
┌──────────────┐ events   │ world engine       │
│ Paper Server │◄────────►│                    │
│              │          └─────────┬──────────┘
│ HeliCraft    │                    │
│ Plugin       │                    ▼
└──────┬───────┘          ┌────────────────────┐
       │                  │ PostgreSQL/PostGIS │
       │                  │                    │
       └─────────────────►│ canonical state    │
                          └────────────────────┘
```

Velocity's modern player forwarding supports forwarding identity information to backend Paper servers, while Velocity documentation explicitly warns that forwarding is not a substitute for properly securing/firewalling backend servers. citeturn8search0turn8search13

### Do not add distributed infrastructure because you can

With ten to thirty players you do not need Kafka, Kubernetes, six microservices and an event bus cluster.

You can have:

- one backend application;
- one PostgreSQL/PostGIS database;
- Paper plugin;
- Velocity;
- website;
- optional Redis only when you identify a real need.

Your homelab experience makes infrastructure easy to over-engineer.

The complexity in HeliCraft is **domain consistency**, not request throughput.

### Canonical source of truth

A practical split:

**Minecraft world owns:**

- block state;
- entities;
- inventory;
- player location;
- physical build.

**HeliCraft database owns:**

- state;
- membership;
- territory;
- title;
- institution;
- currency ledger;
- company;
- law;
- case;
- evidence references;
- treaty;
- history;
- survey metadata.

**Derived/cache data owns nothing.**

### Domain event system

Use a domain event table from the beginning.

```text
domain_event
-------------
id
event_type
actor_id
entity_type
entity_id
occurred_at
payload_json
schema_version
visibility
```

Example:

```json
{
  "event_type": "STATE_LAW_ENACTED",
  "state": "aurora",
  "law": "pvp-prohibition",
  "version": 3
}
```

The event table becomes the foundation for:

- history;
- notifications;
- audit log;
- World Engine;
- debugging;
- eventual analytics.

This is one of the highest-leverage technical decisions in the entire project.

### Commands versus domain events

Minecraft plugin should never directly do:

```sql
UPDATE currency_account SET balance = balance + 1000;
```

Instead:

```text
Plugin → API:
player completed physical institution action

API:
validate permissions
validate state
write transaction/event
return result

Plugin:
show result to player
```

Likewise, website should not directly edit a polygon and assume the Paper plugin notices.

All meaningful changes go through domain operations.

### Territorial geometry

PostGIS is almost ideal.

Store state boundaries as proper polygons/multipolygons.

PostGIS provides spatial indexes and spatial predicates such as containment, allowing efficient point-in-polygon queries and overlap validation. citeturn9search0turn9search1

Do not query PostgreSQL every movement tick.

The plugin can:

1. know the player's current jurisdiction;
2. only re-evaluate after meaningful X/Z movement;
3. query an in-memory spatial cache or local indexed representation;
4. synchronize polygon changes from backend.

For the server sizes discussed, performance is unlikely to be the fundamental difficulty.

Correct boundary semantics are more important.

Decide explicitly:

> a point _on_ a border belongs to which side?

Use one consistent spatial predicate.

### Property geometry

For private property, arbitrary polygons are probably unnecessary initially.

Rectangles/cuboids are far easier to:

- create;
- visualize;
- collision-test;
- protect;
- understand.

Keep beautiful polygons for political jurisdictions.

Nobody needs their bedroom protection polygon to follow a river perfectly.

### State boundaries in-game

Because the client remains vanilla, do not try to render permanent 3D borders.

Use:

- title/actionbar when entering;
- optional particles via `/borders`;
- map website;
- perhaps temporary particles when surveying a property.

This is sufficient.

### World generation

Paper exposes custom generation and block-population APIs, including APIs intended for features such as ores and other structures crossing chunk boundaries. citeturn8search5turn8search11turn8search16

Separate:

**Terrain generation**

from

**HeliCraft geological deposit population**.

That way you can swap your custom terrain generator later without rewriting economic geology.

A deposit generator can receive biome/environment information and apply its own secret seed.

### Survey metadata

The physical survey instrument can use Persistent Data Container metadata so the player still holds an ordinary vanilla-compatible item whose identity and state are understood only by the server. citeturn1search4

Avoid custom models unless UX becomes impossible without them.

This satisfies your desire to minimize resource-pack dependence.

### Claims protection

Do not initially write “protection” as hundreds of arbitrary hard-coded listener cases inside every feature.

Create a central authorization call conceptually like:

```text
canPerform(
    player,
    Action.BLOCK_BREAK,
    location,
    context
)
```

Resolvers consider:

1. server safety rule;
2. war override if explicitly active;
3. property ACL;
4. institution protection;
5. state rules if this is a legally observable but not hard-blocked action.

Critical distinction:

```text
DENY
```

means Minecraft action cannot happen.

```text
ALLOW_AND_RECORD_OFFENCE
```

means action happens and law system receives an event.

That architectural distinction directly implements your three-layer legal philosophy.

### Economy consistency

Every operation involving money and market escrow must be atomic.

Examples:

- buy order fill;
- FX conversion;
- fine collection;
- tax;
- share purchase.

A player must never lose the item while the currency transfer fails, or receive currency twice after a retry.

Use ordinary database transactions and idempotency keys before considering exotic financial infrastructure.

### Item-market escrow

Money can be escrowed easily in the database.

Minecraft items are harder because they exist inside inventories/chests.

The safest V1 pattern is a dedicated **Market Warehouse** abstraction.

Player physically deposits an item.

Plugin serializes/records the inventory representation and removes it from normal circulation.

Website order references that escrowed stock.

On withdrawal, plugin returns it when the player is online or via a controlled claim interface.

This is safer than trying to execute a website transaction against an arbitrary chest that may have changed.

### Evidence integrity

“Immutable” does not need blockchain.

Use append-only records and administrator audit logging.

Allow corrections only by appending:

```text
EVIDENCE_CORRECTION
```

or marking an event invalid with a recorded reason.

Never silently `UPDATE` the event into a different fact.

### Authentication

Minecraft account linking can use a short-lived one-time challenge.

For example:

Website:

```text
/link
Code: H7K4-R2
```

Minecraft:

```text
/link H7K4-R2
```

Backend links UUID to web account.

Do not rely on usernames as primary identity.

### Map integration

A mature renderer such as BlueMap can handle physical-world rendering while your frontend/API supplies HeliCraft overlays. Existing BlueMap ecosystem examples demonstrate player markers and polygonal marker overlays, so this is significantly less risky than writing a terrain renderer yourself. citeturn10search2turn10search5

Keep the semantic map data separate from the map renderer.

That way you can change rendering technology without migrating sovereignty.

### Client-mod policy

EarthMC has a useful existing policy model: performance mods and aesthetic mods are allowed, minimaps are limited to information comparable to the server's own map, and Litematica is allowed without printer functionality, while cheat clients/macros and gameplay-leverage modifications are prohibited. citeturn15view1

For HeliCraft I would explicitly allow:

- Sodium and equivalent performance mods;
- Iris/shaders;
- aesthetic mods;
- Litematica schematic visualization;
- accessibility/QoL that does not automate gameplay;
- minimaps under a fair-play configuration.

Explicitly prohibit:

- X-ray;
- entity/player radar beyond allowed map information;
- cave-mapping where it reveals hidden geology;
- seed-cracking tools intended to reconstruct hidden world data;
- Baritone/autonomous mining or navigation that performs gameplay;
- printer/easy-place automation if it materially automates building;
- combat automation;
- macros repeating gameplay actions;
- freecam when used for scouting through terrain/claims.

There will always be imperfect detectability.

The goal is a comprehensible policy plus anti-cheat, not omniscience.

Your secret geological seed is particularly important because it makes external vanilla seed tools unable to reveal the economically important hidden deposits even if the ordinary terrain seed leaks.

### Version upgrades

Because you want to stay close to latest Minecraft versions, isolate version-sensitive Paper code.

Keep:

```text
domain logic
```

separate from:

```text
Minecraft adapter
```

Do not let every law/economy class import Bukkit classes.

This will materially reduce porting pain.

### Complexity and risk matrix

The following is my assessment for a two-person development team, not an industry benchmark.

| System                           |             Player value |         Engineering complexity |     Design / abuse risk |       Admin load | First-version posture               |
| -------------------------------- | -----------------------: | -----------------------------: | ----------------------: | ---------------: | ----------------------------------- |
| Account ↔ Minecraft linking      |                     High |                     Low–Medium |                     Low |              Low | **Core candidate**                  |
| Website world/history shell      |                Very high |                         Medium |                     Low |              Low | **Core candidate**                  |
| Political map + PostGIS polygons |                Very high |                         Medium |                  Medium |           Medium | **Core candidate**                  |
| State founding/citizenship       |                Very high |                         Medium |                  Medium |           Medium | **Core candidate**                  |
| Governance primitives/templates  |                     High |                           High |                  Medium |              Low | **Narrow V1**                       |
| Private claims/ACL               |                Essential |                           High |    High edge-case count |           Medium | **Core candidate**                  |
| Territorial expansion workflow   |                     High |                         Medium |                  Medium |           Medium | **Core candidate**                  |
| Institutions framework           |                Very high |                         Medium |                  Medium |           Medium | **Core candidate**                  |
| Court/case framework             |                     High |                         Medium |                  Medium |           Medium | **Narrow V1**                       |
| Machine-readable laws            |                Very high |                      Very high |                    High |           Medium | **Narrow V1**                       |
| Arrest/custody                   |         Potentially high |                           High |               Very high |      Medium–High | **Experimental**                    |
| Custom rich-deposit worldgen     |                Very high |                      Very high |       High balance risk |              Low | **Core experiment**                 |
| Survey gameplay                  |                Very high |                    Medium–High |                  Medium |              Low | **Core experiment**                 |
| Farm rebalance                   |    Potentially essential |                         Medium |   Very high social risk |           Medium | **Experiment from telemetry**       |
| Multi-currency ledger            |                Very high |                           High |                    High |              Low | **Core if economy pillar retained** |
| Item order book                  |                     High |                           High |                  Medium |              Low | **Narrow V1**                       |
| FX order book                    |                     High |                           High |                    High |              Low | **Narrow V1**                       |
| Central-bank market maker        |              Medium–High |                           High |    Extreme exploit risk |           Medium | **Experimental**                    |
| Companies                        |                     High |                         Medium |                  Medium |              Low | **Core/Narrow V1**                  |
| Share registry                   |                     High |                         Medium |                  Medium |              Low | **Narrow V1**                       |
| Continuous stock exchange        | Uncertain at small scale |                           High |               Very high |              Low | **Later-depth**                     |
| Periodic share auction           |              Interesting |                    Medium–High |                    High |              Low | **Experimental later**              |
| Treaties                         |                Very high |                         Medium |                  Medium |           Medium | **Core candidate**                  |
| Consensual war contracts         |      Very high when used | Medium backend / high gameplay |                 Extreme | High during wars | **Architecture early, depth later** |
| Frontier expansion               |              Situational |                         Medium | High content-value risk |           Medium | **Later-depth**                     |
| World Engine event framework     |                Very high |                         Medium |                  Medium |           Medium | **Core candidate**                  |
| Autonomous AI World Engine       |                  Unclear |                      Very high |               Very high |          Unclear | **Avoid for now**                   |
| Automated history                |                Very high |                         Medium |                     Low |              Low | **Core candidate**                  |
| Web voice                        |        Nice but non-core |                      Very high |                  Medium |           Medium | **Later-depth**                     |

### What a coherent first implementation looks like

Without making the scope decision for you, the strongest **vertical-slice shape** is clearly visible.

The world needs to know:

> player identity → land → state → institution → law → economy → history.

Not every subsystem must be deep.

For instance, first governance can have only:

> ruler appointment + citizen vote + council vote.

First laws can have only:

> PvP, border status, foreign-property permission.

First economy can have:

> currencies + transfers + simple item/FX orders.

First court can have:

> case + evidence + verdict + fine.

First institutions can have:

> Government, Court, Central Bank.

That is already a _real HeliCraft_.

By contrast, implementing fifty kinds of law while geological geography and history are absent would prove much less.

## Operating rules, telemetry, monetization, and final design conclusions

The first public version should be treated as a **world simulation experiment with unusually good telemetry**, not only a content launch.

You will have the rare advantage of knowing the initial community personally. Use that.

### What to measure

Do not optimize first for raw total playtime.

Track whether HeliCraft creates **cross-player dependency and world change**.

Useful metrics include:

| Metric                                             | What it tests                            |
| -------------------------------------------------- | ---------------------------------------- |
| Returning active players/week                      | basic retention                          |
| Median concurrent players                          | whether world feels occupied             |
| Distinct player↔player transactions                | economic interaction                     |
| Cross-state transactions                           | whether geography/politics creates trade |
| State-law interactions                             | whether laws matter                      |
| Survey discoveries used/shared/sold                | whether information has value            |
| Number of players participating in institutions    | whether institutions are real gameplay   |
| % players who live alone vs state                  | social pull                              |
| Number of meaningful web sessions while MC offline | whether “second game” exists             |
| State proposals that lead to physical action       | website→Minecraft loop                   |
| Physical actions that produce web/history events   | Minecraft→website loop                   |
| Orders with no fill after 7d                       | market liquidity                         |
| Currency holders and 30d transaction volume        | whether national money is actually money |
| Admin interventions per active player              | scalability                              |
| Private-property disputes                          | trust/safety                             |
| New-player conversion into second week             | onboarding                               |
| Event participation                                | authored content value                   |

Most importantly, measure **concentration**.

If one hyperactive player is responsible for:

> 80% of discoveries;

> 90% of trade;

> every institution;

> every public project;

the aggregate server may look active while the social game is actually unhealthy.

### Experiments the initial community should answer

The prototype should intentionally test unresolved hypotheses.

**Resource geography experiment**

Do players actually buy/trade resources rather than simply travel farther?

Do rich deposits make land interesting?

Do farms invalidate them?

**Law experiment**

Does a machine-recorded offence produce fun social interaction or simply arguments?

Do players understand border warnings?

Do courts actually happen?

**Currency experiment**

Will a state voluntarily use its own currency after the novelty wears off?

Will citizens accept payment in it?

Will another state quote it?

**Institution experiment**

Does making a building mechanically important make players care more about constructing and visiting it?

Or do they still treat the building as a bureaucratic unlock?

**Website experiment**

Do players open the site because something interesting is there, or only because a command has been moved out of Minecraft?

This distinction may determine whether the entire differentiator succeeds.

### “Website as friction” test

For every website-only action ask:

> Would putting this in Minecraft make the experience better, or merely less cumbersome?

A constitution editor clearly belongs on the web.

A currency chart clearly belongs on the web.

A ten-page treaty belongs on the web.

Giving another player permission to open a chest might be faster in Minecraft.

Do not relocate an action just to increase website metrics.

### Administration workload

Ten hours per week at the initial size gives you considerable freedom to use human judgment intelligently.

Spend it on **high-leverage world decisions**:

- borders;
- institutions;
- appeals;
- major historical events;
- rare wars;
- disputed dissolutions.

Do not spend it on:

- approving every property parcel;
- manually settling every shop transfer;
- checking every free-form law;
- deciding whether every house is pretty.

This provides a clean boundary:

> **Humans ratify legitimacy; software handles repetition.**

### Administrative council

Every impactful administrative action should produce a public or appropriately visible record.

Examples:

```text
Territorial expansion approved
Institution verified
Appeal granted
State dissolved
War contract approved
```

Where the reviewing administrator has a conflict, show recusal.

This becomes increasingly important when HeliCraft stops being only a friend group.

### Alts

Your proposed approach is reasonable:

> one human = one political/economic player identity.

EarthMC likewise prohibits alternative accounts and permits multiple genuine players to share a network connection, illustrating why IP alone cannot be treated as definitive evidence of an alt. citeturn15view1

Do not make anti-VPN or IP matching an automatic irreversible judge.

Use it as evidence.

Alts are especially dangerous in HeliCraft because they can manipulate:

- elections;
- company shares;
- liquidity;
- discovery;
- citizenship counts;
- fake market demand.

Thus all important mechanics should avoid “number of accounts” as a direct power metric anyway.

### Abuse philosophy

You cannot algorithmically prevent all collusion without destroying the social game.

Friends are allowed to coordinate.

States are literally organized collusion in the economic sense.

The boundary should be:

> **coordination is gameplay; manufacturing fake events solely to exploit a system reward is abuse when the relevant rule explicitly defines it as such.**

This is another reason not to reward raw metrics mechanically.

### Persistent private property and death

There is an apparent contradiction in your answers:

> vanilla death drops items;

while:

> personal inventory/progress should not be something politics can permanently confiscate.

These are actually compatible.

The rule can be:

> **ordinary Minecraft mechanics may cause ordinary Minecraft loss; political systems do not gain arbitrary authority to delete protected core progress.**

You can die and lose carried items.

A government cannot click:

> “confiscate Maksim's entire Ender Chest.”

A war can kill you under agreed rules.

It cannot automatically delete your historical achievements or unregistered home.

### Monetization

Your instinct to avoid gameplay advantages is correct and strategically valuable.

Current Minecraft Usage Guidelines permit server monetization under conditions, including donations, cosmetics and some gameplay-affecting entitlements so long as they do not give competitive advantage or worsen other players' experience; virtual currencies are permitted only under restrictions including no real-world cash-out/value and no misleading resemblance to official currency. The guidelines also require clear unofficial-product attribution and a prominent disclaimer, and state that monetized server offerings/advertising must be suitable for all ages. citeturn18search0

Because HeliCraft's fantasy is strongly competitive/political, I would choose a stricter internal standard than the maximum Mojang allows:

> **real money never buys political, economic, military, territorial or informational advantage.**

Good monetization candidates:

- supporter badge on website;
- cosmetic profile themes;
- cosmetic map/profile personalization;
- server-wide donation goals;
- purely cosmetic chat/profile elements;
- optional supporter history page styling;
- community funding page.

Be particularly careful with:

- extra company slots;
- extra private land;
- hidden-map access;
- reduced market tax;
- faster surveys;
- currency advantages;
- special political permissions.

Those are directly competitive inside HeliCraft's core game.

The official guidelines can change, so they should be reviewed again before monetization launches. citeturn18search0

### Branding and age range

Because your present audience includes minors, explicit community-safety rules should exist **above national sovereignty**.

A state may be an in-game dictatorship.

It may not authorize real harassment.

A state may censor its fictional newspaper.

It may not authorize doxxing.

A state may outlaw foreigners in its fictional jurisdiction.

It may not use server mechanics to create actual hate campaigns against protected groups.

Minecraft's current Community Standards emphasize a safe and inclusive community and prohibit hate speech, harassment, sexual solicitation and related conduct. citeturn18search4

This is a critical conceptual separation:

> **States are sovereign inside the game fiction; HeliCraft administration remains sovereign over the actual community.**

### Final judgments on the unresolved systems

| Question                                                    | Research-backed design conclusion                                                                                                                           |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Should HeliCraft force RP?**                              | No. Systems should create situations worth role-playing, but ordinary language/play remains valid.                                                          |
| **Can one player found a state?**                           | Yes. Minimum-population gates are especially artificial at this scale.                                                                                      |
| **Should government types be hardcoded?**                   | Use templates over composable governance primitives.                                                                                                        |
| **Should states have complete sovereignty?**                | No. Universal server-safety/property guarantees remain above them.                                                                                          |
| **Should machine laws prevent crimes?**                     | Usually no; they should detect/record. Destructive grief remains hard-protected.                                                                            |
| **Should prisons exist?**                                   | Architecturally yes if players want them; forced idle imprisonment should not be core punishment.                                                           |
| **Should arrest be a PvP duel?**                            | No. Use warrant-gated contestable custody.                                                                                                                  |
| **Should free-form law be admin-enforced?**                 | Not by default. Administration cannot become every state's police force.                                                                                    |
| **Should institutions be unlocked by “development score”?** | No. Political decision first, physical construction and ratification second.                                                                                |
| **Should buildings be algorithmically rated?**              | No. Validate functional requirements and obvious legitimacy, not aesthetics.                                                                                |
| **Should every institution be a separate building?**        | No. Only systems where physicalization creates meaningful gameplay.                                                                                         |
| **Should a central server fiat currency exist?**            | Prefer no. Barter + player/state currencies creates a stronger identity.                                                                                    |
| **Can states print unlimited money?**                       | Yes, if constitution authorizes it. Make supply and issuance radically transparent.                                                                         |
| **Should the server dynamically set FX rates?**             | No. Market or explicit state peg should determine rates.                                                                                                    |
| **Should market makers exist?**                             | Potentially yes, with finite reserves and explicit balance sheets.                                                                                          |
| **Should server continuously refill their reserves?**       | No. That creates effectively infinite admin demand.                                                                                                         |
| **Should companies exist early?**                           | Yes; companies create useful ownership and organizational structure.                                                                                        |
| **Should shares exist?**                                    | Yes as ownership records.                                                                                                                                   |
| **Should a stock exchange exist immediately?**              | Probably not as a continuous market. Test it only after real companies and investors exist; periodic auctions are promising.                                |
| **Should all resources be regional?**                       | Geographic geology is strong, but vanilla renewability makes literal “all resources” incompatible without substantial rebalance.                            |
| **Should farms be secretly nerfed?**                        | No. Measure first and make explicit targeted changes where necessary.                                                                                       |
| **Should villagers be removed?**                            | No initial need. Monitor the specific ways they invalidate economic loops.                                                                                  |
| **Does the Nether destroy HeliCraft geography?**            | Not if geography means jurisdiction/resources rather than travel time. Keep vanilla portals; enforce law at destination.                                    |
| **Should Nether/End be state territory?**                   | International commons initially.                                                                                                                            |
| **Is Frontier a core loop?**                                | No. It is better as a rare response to map saturation and a major historical event.                                                                         |
| **Should the world wipe?**                                  | The concept becomes much stronger without routine wipes. Expansion/administrative intervention should solve saturation where possible.                      |
| **Should historical names update retroactively?**           | No. Events preserve the name/identity as it existed then.                                                                                                   |
| **Should banned players disappear from history?**           | No, except moderation may hide prohibited content.                                                                                                          |
| **Should wars be normal?**                                  | No. Rare, consensual, contract-defined war is much more compatible with persistent builds.                                                                  |
| **Should private builds be destructible in war?**           | Only by explicit owner/war-contract opt-in; default no.                                                                                                     |
| **Can institutions be destroyed?**                          | Yes under agreed conditions; destruction suspends capabilities rather than deleting state data.                                                             |
| **Can admins play?**                                        | Yes for the current model, but recusal and multi-person ratification are necessary before larger public growth.                                             |
| **Should live player locations be public?**                 | Usually acceptable in peacetime; define concealment and war rules explicitly.                                                                               |
| **Should World Engine use an LLM?**                         | Only as drafting assistance. Deterministic state + human approval should control effects.                                                                   |
| **Should World Engine understand every block?**             | No. Base it primarily on registered entities/domain events.                                                                                                 |
| **Should the website be mandatory?**                        | Mandatory for deep institutional play, not for every minute of Minecraft.                                                                                   |
| **What should the home page answer?**                       | What changed? What can I do? What needs my attention?                                                                                                       |
| **What is the strongest unique feature?**                   | The bidirectional Minecraft ↔ website world model, with player-created political/economic institutions physically represented in the same persistent world. |

### The strongest version of the HeliCraft fantasy

The original design framed HeliCraft as a world whose progression belongs increasingly to the world rather than the character. fileciteturn0file1

The newer model improves that by giving players much more authorship: the system is no longer an invisible game director that decides whether Aurora deserves a bank or a currency. Aurora decides that it wants a bank. Players legislate it, build it, get it ratified, operate it, potentially mismanage it, perhaps defend it, and eventually leave behind a history of what happened. fileciteturn0file0

That suggests a more precise final design statement:

> **HeliCraft is a persistent social sandbox in which Minecraft is the physical layer and the HeliCraft website is the institutional layer. Players do not merely join pre-programmed factions: they create states, constitutions, companies, currencies, laws, institutions, territorial arrangements and historical events. These abstractions become meaningful because they are attached to real places, resources and actions inside Minecraft. The server protects long-term creative investment while allowing political, economic and social consequences to remain real.**

And the best test for every future feature is no longer only:

> “Why will the veteran log in tomorrow?”

It should be a sequence:

> **What changed because other people exist?**

> **Can I meaningfully respond?**

> **Does that response happen partly in Minecraft rather than only in a menu?**

> **Will the world remember it?**

> **Can what I did create a new situation for someone else?**

If the answer repeatedly becomes yes, HeliCraft is not Towny with a frontend.

It becomes the “double game” you described: **Minecraft for physical action, HeliCraft for society and meaning, with neither half complete without the other.**
