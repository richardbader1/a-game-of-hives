# Explicit digital implementation conventions

The physical-game rules do not spell out some computer interactions. These are **documented conventions**, not undisclosed alterations of the original rules.

1. **Acting in place:** choosing the beekeeper's current tile is a legal destination for a repair/improvement; this avoids an artificial need to move away and back.
2. **Purchased hive deployment:** buying a hive enters a choose-a-valid-tile placement flow within the trade phase. Place immediately and deduct products only on confirmed legal placement; no third action is spent.
3. **Random selection:** uniformly select from existing relevant hives/tiles, including damaged. Test protection on selected target; a blocked effect is not re-targeted.
4. **Tile destruction evacuation:** remove tile and attached structures and move any occupying token to the surviving tile with minimum hex distance, breaking ties by stable `(q,r)` ordering. In rare no-surviving-tile states, immediately check losing outcome and do not fabricate a new tile.
5. **Local persistence:** autosave started games using a versioned schema in browser localStorage. Offer explicit Resume/New Game actions. Restore resolved events, action slots, locked beekeeper destinations and pending purchases exactly; never reroll on resume. Reject invalid or unsupported saves with an explanation. Storage failures must not prevent play. Setup before the first turn is not saved.
6. **Exhausted finite piece supply:** a garden-extension event or a protection action may have no valid tile/piece left. Explain this rather than inventing an extra piece. Default supply counts (6 of each tile type, 3 of each improvement type, 15 hives overall) come from print-and-play components, not repeated in V1.2. Current supply is calculated from pieces in play, so destroyed tiles and hives return to available supply; this existing policy is documented, not changed here.
7. **Resource loss:** a successful damage/destruction event on a garden tile decreases matching inventory by one if available; inventory never becomes negative.
8. **Passing actions:** the current game permits a voluntary pass even when a legal move exists. A pass consumes one of the two distinct action slots and is recorded as voluntary; designer confirmation is still needed on whether this policy should remain.
9. **Action validity:** when a dice restriction or board state makes an action impossible, allow the team to skip that unused category rather than soft-locking the game. A skipped action still consumes one of the two distinct action slots.
10. **Bee evacuation fallback:** prefer the nearest surviving healthy tile after destruction. If none is healthy, shelter the bee on the nearest surviving damaged tile using the same deterministic tie-break. This forced relocation collects nothing and uses no action. Normal movement still cannot enter/pass damaged tiles; repairing or extending the garden can restore legal destinations. This extends evacuation bookkeeping to avoid permanently removing a character from a live game.
11. **Round boundary:** a round ends when play returns to the selected starting player, after each named player has taken one turn.

Flag any further ambiguous interpretation in documentation before implementing it. Do not silently change the rules.

## Gameplay engine integration

- `src/game/engine/gameEngine.ts` owns gameplay transitions and accepts the serialisable game snapshot plus an injectable random-number function for dice and event targets.
- The Zustand store forwards gameplay requests to the engine. React and Three.js render the returned state; they do not directly update inventory, score, damage, or protections.
- Setup remains a separate phase. A turn must resolve its die event before selecting actions; action categories are used at most once per turn. Skipping an unavailable action consumes that distinct action slot so play can continue.
- Game-over state is terminal until the players choose to start a new game. The score is calculated from currently held honey and bee bread at turn end.
- The gameplay view uses an orthographic isometric camera with bounded pan, wheel/pinch zoom and a Reset View control that frames the current tile bounds. Camera state is presentation-only and does not change gameplay state.
- The always-visible inventory bar exposes recipes on hover, focus and tap. It sends purchases through the existing trade actions, which still enforce trading phase, affordability and legal hive placement.
- A beekeeper action commits at most one straight-line destination from the position at action selection. The destination remains locked until one repair/improvement or an explicitly recorded pass finishes that action; moving in place remains legal.
- Hive placement is an uncommitted trade until a legal destination is confirmed. It can be cancelled without cost, and the engine rechecks supply, affordability and destination validity before deducting products.
