# Milestone acceptance tests

## Setup
- Reject fewer than two/more than four named players.
- Five connected tiles required; reject disconnected final placements.
- At least one each pollen, nectar and water.
- Final five-tile board is not wholly collinear.
- Four hives occupy four distinct intact tiles; both characters placed on the board.

## Turn engine
- Die generates values 1–6; deterministic tests can inject a sequence.
- Resolving a garden die event does not consume an action.
- Two actions are from distinct categories.
- Bee movement cannot traverse damaged/missing tiles; beekeeper can enter damaged tiles.
- Beekeeper movement is limited to one straight-line destination from the action's original position; a second move, corner turn, or action switch after moving is rejected.
- Beekeeper may act in place, or move then repair/improve once; passing after choosing a destination consumes that beekeeper action and preserves no extra movement.
- Bee collects 1 unit on a healthy tile without healthy hive, 2 units with healthy hive.
- Pesticide event prevents non-water collections except when destination has no-spray protection.
- Extreme-weather movement restriction blocks Bee Action.

## Events and protection
- Random target selection includes damaged candidates and is deterministic under seeded test RNG.
- A smart hive blocks Varroa but not extreme-weather hive damage.
- Wildlife reserve prevents removal on repeated damage but does not prevent first damage.
- No target available gives explanatory no-op.
- Destroyed tile removes attached hive/improvements and relocates tokens deterministically.

## Trading and victory
- Honey costs one each pollen/nectar/water; bee bread costs 2 pollen + 3 nectar.
- Hive costs 2 honey + 3 bee bread and requires a legal tile.
- Multiple affordable trades are permitted in trade phase; respect the configurable 15-hive supply cap.
- Hive placement can be cancelled without spending resources, invalid/stale commits do not deduct resources, and a pending placement blocks turn completion.
- Buying a hive reduces held score by 8 points (2 + 3*2), and never awards points for the hive itself.
- Win at trade-phase end if `honey + 2*beeBread >= 10`.
- Lose immediately when no healthy hives remain (even if damaged hives still exist).
- Inventory never goes below zero.

## Pre-graphics readiness
- Returning to the selected starting player increments the round, regardless of roster index.
- If destruction leaves only damaged tiles, the bee shelters on the nearest survivor and can move again after a legal destination is repaired/added. Forced relocation never collects resources.
- Gameplay commands are rejected during setup and after game over; setup commands cannot restart a live game.
- Keyboard/DOM controls use the same legal destinations and commands as canvas input, including free event placement and purchased hives.
- Resource types remain distinguishable without colour, and textual tile inspection includes characters, damage, hives and protections.
- Save/reload preserves resolved events, committed destinations, distinct action slots and pending purchases without rerolling/spending again.
- Unsupported, malformed or inconsistent saves are rejected gracefully. Missing/blocked/full storage does not crash the game.
- A full scripted game runs from manual setup to victory; each intermediate autosave passes validation.
- Pan, zoom, touch pinch and Reset view do not alter the saved game. Long gardens fit the usable viewport without crossing the camera clipping planes.
- CI validates tests, build and browser interactions. Publishing is a separate manually triggered workflow.
