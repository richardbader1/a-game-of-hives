# A Game of Hives — MASTER VS CODE PROMPT (Version 1.0)

## Role and objective

Act as a senior TypeScript, React, Three.js and educational-game developer. Build **A Game of Hives**, a polished, browser-based, cooperative, isometric 3D board game for children aged **10–12**. The players discuss moves and act as a team to save the queen bee. Automate bookkeeping and rule validation; leave meaningful decisions to the students.

This repository contains the confirmed specifications in `docs/game-rules.md` and `docs/confirmed-decisions.md`, original source materials in `references/`, and a planned folder tree. **Read those files before coding.** `Bee game 1 page intructions V1.2.pptx` is the primary rules authority. The print-and-play PDF is a supplementary source for component artwork and quantities. Where an illustrated label contradicts the V1.2 trading diagram, use the diagram and the written confirmations in the Markdown files.

## Product requirements

- **2–4 local players** on a shared computer or tablet, entering their names at the start. Rotate the current-player indicator, but keep all game pieces, resources, decisions and points shared. No accounts, backend or network multiplayer in v1.
- **Manual starting garden:** students choose and place five adjoining hex tiles. At least one pollen, one nectar and one water tile must be present. Final five-tile layout must not all lie in one straight axial-hex line. Show valid positions and require confirmation before play.
- Place four hives on **four different** tiles, then place one bee and one beekeeper on garden tiles. Both can occupy the same tile.
- A cooperative **10-point win** is checked **at the end of the turn after trading**. Score is from **products still held**: `honey + 2 * beeBread`. Spending honey or bee bread to build hives decreases the score. No historical/cumulative score for winning.
- **Immediate loss** if the team has **zero healthy hives** (damaged hives do not count as healthy).
- Use stylised, friendly, low-poly/isometric 3D inspired by accessible family board games, NOT detailed realistic simulation. Clean, uncluttered interface; short instructions; big click/touch targets; accessible symbols alongside colour.
- Support GitHub Pages deployment and local browser save/resume.

## Required technology

- Vite + React + TypeScript.
- Three.js via `@react-three/fiber` and `@react-three/drei`.
- Zustand for game state; a **pure, testable TypeScript game engine**, independent of 3D and React.
- Vitest for engine tests and React Testing Library for key controls as useful.
- CSS or CSS Modules; no unnecessary UI framework or backend.
- Configure the Vite `base` path correctly for GitHub Pages, avoiding hardcoded root-relative asset URLs.

## Rules — implement exactly

### Garden resources

- **Red = pollen**, **gold/yellow = nectar**, **blue = water** (V1.2; colour mapping differs from the older print-and-play PDF).
- The bee moves in a straight axial-hex line through existing connected tiles. It may not cross, enter or stop on damaged/destroyed tiles. Select a legal destination with click/tap, not keyboard-based free movement.
- Bee landing on a healthy garden tile collects **one** corresponding resource; landing on one with a **healthy hive** collects **two**. A hive damaged or destroyed gives no bonus. The Bee Action is the movement + collection combined.
- The beekeeper moves in a straight axial-hex line and may perform **one** of these effects at the destination: repair a damaged hive, repair a damaged garden tile, add a no-spray zone, add a smart-hive improvement, or add a wildlife reserve. These effects cost **no resources**, but require a Beekeeper Action. Only valid targets should be selectable. The beekeeper may enter a damaged tile to repair it (unlike the bee). A selected destination may be the current tile, allowing repair without compulsory displacement: this is a user-friendly digital convention.
- Garden Action: extend the garden with **one** adjacent tile, selecting its resource type from available tiles. Do not allow disconnected tile placement. Starting layout must not be a single straight line; do not invent an additional arbitrary limit on branches or garden size.

### Turn and actions

1. Show active player's name, allow a die roll (uniform random integer 1–6).
2. Resolve the corresponding environmental event completely, including random targeting or an interactive free-garden placement for a roll of 6.
3. Team performs **two actions from different categories** chosen among Bee, Beekeeper and Gardening. The same category cannot be chosen twice in one turn. Event restrictions still apply.
4. Enter trading phase; team may perform **any number of affordable trades**, then choose Finish Turn.
5. Check for a win (10+ points of held products), otherwise advance to next player's turn. Detect the zero-healthy-hives loss **as soon as it occurs**, including during event resolution.

### Dice table (each face equally likely)

| Die | Name | Effect |
| --- | --- | --- |
| 1 | Varroa mite | Random existing hive suffers damage. |
| 2 | Climate change | Random existing garden tile suffers damage. |
| 3 | Pesticides | Bee can collect **only water** during the current turn, except on a no-spray-protected tile. |
| 4 | Extreme weather | Bee cannot move during the current turn. The Bee Action is unavailable. |
| 5 | Extreme weather | Random existing hive suffers damage. |
| 6 | Garden | Team gets a **free** adjacent garden tile placement during event resolution, not consuming either action. |

- Targeted objects are chosen randomly and **uniformly from existing eligible objects**, including already-damaged objects. Resolve protection **after** target selection. A protected target can block an event; do not silently reroll onto another object.
- The random generator must be **injectable/seedable** for deterministic automated tests and reliable event logs.
- If there is no legal target or no available tile, display a clear 'no effect' message; do not crash or loop.

### Damage, protection and destruction

- Healthy hive -> damaged hive -> destroyed and removed hive on the next successful damaging hit.
- Healthy tile -> damaged tile -> destroyed and removed tile on the next successful damaging hit, **unless** protected against removal.
- Each successful tile damage/destruction event removes **up to one** matching resource from the shared supply, never below zero.
- **Smart hive:** blocks **Varroa mite** damage to the improved hive; do **not** make it protect against extreme weather.
- **Wildlife reserve:** prevents that garden tile from being **removed** after a second damaging hit; it does not prevent its first damage. A protected damaged tile remains damaged on repeat hits until repaired. Do not incorrectly convert this into immunity to all damage.
- **No-spray zone:** when the bee lands on this tile during a pesticide turn, it may collect this tile's normal resource. The restriction still applies on unprotected tiles.
- If a tile is destroyed, remove any hive and tile improvements on it. Rehome a bee or beekeeper standing there onto the nearest surviving tile, using a deterministic axial-distance/tie-break algorithm and showing a short explanation. This relocation is a digital convention, not an additional student action.
- Repairs return a damaged object to healthy. No repair of destroyed/removed objects.

### Trading and products

| Product | Required cost | Held-score value |
| --- | --- | --- |
| Honey | 1 pollen + 1 nectar + 1 water | 1 |
| Bee bread | 2 pollen + 3 nectar | 2 |
| Hive | 2 honey + 3 bee bread | 0 |

- **No per-turn trade limit**, but verify affordability before every trade and update the shared inventory immediately.
- A purchased hive is placed immediately during trading on an existing, intact garden tile without a hive. Selecting its location and confirming is part of that trade, **not a third action**. Disable purchase with a helpful explanation if no destination exists. This is a digital implementation convention because the physical rules do not specify hive-purchase placement timing.
- Trading costs and rules must be centralised and easy to configure. Do not create a separate 'points currency'.

### Component supply

- The print-and-play material shows **six garden tiles of each resource, three of each improvement (smart hive, wildlife reserve, no-spray zone) and fifteen hive pieces**. Use these as **configurable default finite supplies** (6+6+6 tiles, 3+3+3 improvements, 15 total hives), while noting that V1.2 does not expressly restate these caps. Install an improvement only when an unused piece remains; an improvement can be placed only once on a given eligible tile/hive. Do not independently change quantities, costs or event probabilities during initial development.

## Student experience and accessibility

- Start screen -> player names -> choose starter -> manual five-tile garden layout -> place four hives -> place the bee and beekeeper -> play -> win/loss summary.
- Fixed orthographic isometric camera with simple zoom/pan and sensible defaults. Pointy-topped extruded hexes, soft lighting, selectable 3D tokens and distinct healthy/damaged states. Use geometric placeholders first; later replace pieces with GLB models in `public/models/`.
- No forced WASD movement, complicated camera controls, tiny icons or unnecessary modals. Users tap a piece/action, then a highlighted legal target, then confirm.
- Separate game scene, HUD, events, trade/shop and short action guidance.
- Show current player, round, dice result, two-action tracker, shared resource inventory, hive health, and held score/10.
- Always communicate event outcomes ('Varroa mite hit the north hive; Smart Hive protected it'). Show disabled actions with simple explanations.
- Include undo for an **uncommitted selection** and confirmation before irreversible trades. Maintain a chronological event/history log. Avoid undoing already-rolled random outcomes by default.
- Respect reduced-motion preferences, keyboard-accessible 2D controls, touch input and non-colour labels for resources.
- Support local save/resume with a versioned JSON state schema; gracefully handle older or invalid saves.

## Architecture requirements

- Axial `q, r` hex coordinates (use derived third coordinate for straight-line and distance checks).
- `src/game/` owns rules, selectors, validation, deterministic state transitions and types. Its pure functions never import React or Three.js.
- `src/components/scene/` renders state and dispatches validated actions; it must not independently enforce rules.
- `src/components/ui/` and `src/components/setup/` render views and guide students.
- Explicit phase machine: `playerSetup -> gardenSetup -> hiveSetup -> characterSetup -> roll -> resolveEvent -> action1 -> action2 -> trade -> checkEnd -> nextTurn` (with win/loss terminal states).
- Centralised configuration in `src/game/config/rulesConfig.ts`, and events/recipes in `src/game/data/`.
- Use a typed reducer-like game engine with error results for illegal transitions. Never directly mutate UI objects to change game state.
- Include tests for initial resource composition, connectivity, non-collinear setup, axial movement, blocked tiles, 2 distinct actions, die events, uniform target selection with seeded RNG, protections, trades, held points, garden extension, lose/win timing and save-state restoration.

## Build order — do not implement everything in one giant pass

**Milestone 1: working isometric setup prototype**
1. Inspect existing files, confirm stack and scaffold Vite into this repository without deleting `docs/` or `references/`.
2. Build types, configuration, axial utilities and initial game state.
3. Create 2–4-player name entry and starting-player selection.
4. Render a responsive 3D hex garden with basic coloured shapes, fixed orthographic camera, raycast selection and highlighted valid placements.
5. Implement choosing/placing five tiles, enforcing connectivity, at least one of each type and non-collinear final shape.
6. Implement four-hive placement on distinct tiles and bee/beekeeper placement.
7. Render a simple gameplay HUD with current player, resources and score (not the full engine yet).
8. Add unit tests for setup rules; run `npm run build` and `npm test` and fix failures.

**Milestone 2: game engine**
Implement turns, both actions, free dice-garden placement, events, damage, protections, trades, scoring and win/loss checks; include thorough deterministic tests.

**Milestone 3: polished school-facing experience**
Replace placeholder geometry with stylised 3D GLBs, animation, contextual explanations, accessibility refinements, saving and help/tutorial panels.

**Milestone 4: validation and publication**
Run playtests, compare expected turn sequences to tabletop rules, ensure mobile/tablet usability, add GitHub Actions deployment and publish to GitHub Pages. Do not rebalance game mechanics based on speculation.

## What to do immediately

**Begin Milestone 1 now.** Provide a concise architecture plan, then create real code directly in this workspace. Do not just repeat the plan. When done, show files changed, how to run the dev server, results of build/tests and the next milestone. Do not claim features work without actually running the available checks.
