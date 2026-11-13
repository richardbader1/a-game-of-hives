# Digital Rules Reference — A Game of Hives v1

This document is the coding source of truth. See `confirmed-decisions.md` and `PROMPT_FOR_VSCODE.md` for acceptance criteria and architecture.

## Components and setup
- Players: 2–4 named, local, cooperative, one shared inventory.
- Starting board: five connected tiles, not all on one axial line, containing all three resources.
- Tiles: red = pollen, gold = nectar, blue = water.
- Start with four healthy hives on distinct garden tiles, one bee and one beekeeper.
- 3D objects are visual renderings of serialisable logical objects; occupancy is by tile ID.

## Gameplay
- A turn is roll -> apply event -> action 1 -> action 2 -> trade -> evaluate held score -> next named player.
- Two actions must be from different categories: **Bee**, **Beekeeper**, **Garden**.
- Bee: move along a straight connected hex line, cannot enter/pass damaged tiles, collect one corresponding resource on landing or two if there is a healthy hive. Do not collect if the current event prohibits it.
- Beekeeper: move in a straight connected hex line, then repair damaged hive/tile or install no-spray zone, smart hive or wildlife reserve on the destination tile. Zero resource cost; one whole action. The beekeeper may stand on a damaged tile for repair.
- Garden: add one adjacent tile, using a type still in supply.
- Trading: unlimited trades as long as affordable; a purchased hive is placed immediately on an undamaged tile that does not already hold a hive.

## Dice events
| Face | Effect |
|---|---|
| 1 | Varroa: randomly target an existing hive; apply damage unless a smart-hive protection blocks it. |
| 2 | Climate change: randomly target an existing garden tile; apply tile damage with wildlife-reserve anti-removal check. |
| 3 | Pesticides: only water may be collected this turn, except on a no-spray-protected tile. |
| 4 | Extreme weather: no Bee Action this turn. |
| 5 | Improvement: choose and place one free new garden tile before taking actions. |
| 6 | Garden: choose and place one free new garden tile before taking actions. |

Each face is 1/6. Faces 5 and 6 are both Improvement, giving garden growth a combined probability of 2/6. This mapping was explicitly approved by the designer on 13 November 2026 to match the custom GTAC GLB. The former face-5 weather hive-damage outcome is no longer rolled; already-resolved outcomes in older saves remain intact. Eligible random targets include healthy and damaged objects; sample uniformly. Resolve protection after selection, never silently reroll a protected target. No target/no legal placement -> explain that the event has no effect.

## Damage and protection
- Hive: healthy -> damaged -> removed on next successful damage.
- Tile: healthy -> damaged -> removed on next successful damage (unless wildlife reserve stops removal, leaving it damaged).
- Successful damaging tile events each remove at most one matching resource token from inventory, floored at zero.
- Bee cannot pass damaged tiles; beekeeper can access damaged tiles for repairs.
- Smart hive protects against Varroa only.
- Wildlife reserve prevents tile removal only.
- No-spray zone exempts its tile from pesticide-related collection restrictions.
- Destroyed tile also destroys any hive or improvements on it; move an occupying character to nearest surviving tile with deterministic tie-break.
- Repairs restore damaged objects to healthy, not destroyed objects.

## Products and goal
| Product | Cost | Held score |
|---|---|---:|
| Honey | 1 pollen, 1 nectar, 1 water | 1 |
| Bee bread | 2 pollen, 3 nectar | 2 |
| Hive | 2 honey, 3 bee bread | 0 |

Current victory score = `inventory.honey + 2 * inventory.beeBread`. Win on 10+ **at turn end following trading**. Immediate defeat at 0 healthy hives. Score falls when point-bearing products are spent.

## Game balance guardrails
- Do not change recipes, events or the held-score victory condition without designer approval and recorded playtest evidence.
- The print-and-play components provide six tiles of each type, three of each improvement type and fifteen hive pieces. Use those configurable physical-supply limits by default (including the four starting hives). Treat these as configurable because V1.2 does not repeat piece counts.
- Avoid assuming a starting resource inventory unless otherwise directed; default to zero.
