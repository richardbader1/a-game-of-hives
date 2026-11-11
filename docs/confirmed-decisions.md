# Confirmed decisions — locked for v1

## Product
- 2–4 players sharing the same device; cooperative discussion, named turns and team-wide inventory.
- V1.2 one-page rules are authoritative. Use print-and-play PDF for visual components and material quantities only where V1.2 is silent.
- Isometric stylised 3D, similar in tone to a friendly Mario Party board. Mouse/touch support.
- Static site hosted on GitHub Pages, no initial server or real-time multiplayer.

## Setup and board
- Students place exactly five starting garden tiles.
- Include at least one tile each of red/pollen, gold/nectar and blue/water.
- All tiles must be connected. Five tiles may not form only one straight line.
- Students place four initial hives, one on each of four separate tiles, and position the bee and beekeeper.
- The non-linear rule is applied to the completed starting configuration; do not impose an invented maximum straight run for later garden growth.

## Turns and strategy
- Each turn has a dice event, two actions from **different** categories (bee, beekeeper, garden), then unlimited affordable trades.
- The bee and beekeeper move along straight hex lines. Damaged tiles block the bee, but the beekeeper can reach them to repair them.
- Repairs and protective improvements consume a beekeeper action, **not resources**, and apply at the destination. Improvements still consume a finite improvement piece from the original print-and-play supply (three of each type by default).
- A die roll of six gives one free additional garden placement before normal actions.
- The game, not the students, chooses random event targets.

## Protecting the garden
- Smart hive blocks Varroa damage, but not extreme-weather hive damage.
- Wildlife reserve blocks tile removal, not the first damage to that tile.
- No-spray zone exempts that tile from the pesticide restriction on resource collection.
- A destroyed tile loses its hive and improvement; characters on that tile move to the nearest surviving tile, with a clear explanation.

## Trades, score and outcome
- Unlimited trades per trading phase while affordable.
- Honey costs 1 pollen + 1 nectar + 1 water, worth 1 held point.
- Bee bread costs 2 pollen + 3 nectar, worth 2 held points.
- New hive costs 2 honey + 3 bee bread, worth 0 points.
- Winning means **10+ points in unspent honey and bee bread at the end of the turn**. Product purchases subtract from these held points.
- Losing occurs immediately when no healthy hives remain.

## Source-derived details vs digital conventions
- Source-derived: dice faces, resource colours, turn structure, movement direction, damage, protection names, trade recipes, 10-point goal, loss condition.
- Agreed interpretations: two action categories must be distinct; unrestricted straight-line distance on contiguous tiles; no resource cost for repair/improvement; held-product scoring; protected random event target does not reroll; tiles and pieces are automatically reconciled after destruction; roll-six garden tile is a free placement.
- Digital conventions (not specified by physical instructions): may act in place with the beekeeper; purchased hive is placed immediately in trading; tied relocation candidates resolve deterministically; use versioned browser save; supply defaults are configurable.
