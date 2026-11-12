# Guided onboarding and GTAC interface

## Architecture and files

The existing React / Zustand / React Three Fiber architecture is retained. `gameStore`, the setup and gameplay engines, selectors, recipes, save schema and validation rules remain the authority for all game actions.

- `src/components/setup/Welcome.tsx` and `src/app/App.tsx`: purpose, cooperation, win/loss cards and learning goals before names; existing saved-game choices remain available.
- `src/store/tutorialStore.ts` and `src/components/ui/Tutorial.tsx`: presentation-only tutorial state, state-derived tasks, event explanations, review history, skip/restart, responsive spotlight and instruction card positioning. Back reviews text and never rewinds the board.
- `src/components/setup/HivePlacement.tsx` and `CharacterPlacement.tsx`: one example hive in guided setup, progress, role explanations and ready-to-play summary.
- `src/components/scene/IsometricBoard.tsx`, `HexTile.tsx` and `PlacementPreview.tsx`: legal recommended hex, translucent tile and piece previews, visible damage/protection badges. Preview models share geometry but own translucent materials; they never intercept board gestures.
- `src/components/scene/BoardCamera.tsx`: frame the canvas after removing the previous HUD overlays.
- `src/components/ui/GameHUD.tsx`, `InventoryToolbar.tsx`, `BoardDestinations.tsx`, `GameHelp.tsx` and `HelpTip.tsx`: turn stages, labelled resources, hive health, persistent Help, touch/keyboard disclosures and automatically opened legal destination controls.
- `src/styles/gtac.css`, `global.css`, `src/app/main.tsx`, `public/fonts/`: GTAC palette, locally hosted Figtree and its OFL licence, larger controls, focus and reduced-motion styles, responsive board/sidebar layout.
- `tests/integration/tutorial.test.tsx` and `tests/browser/onboarding.spec.ts`: tutorial transitions and complete desktop/tablet walkthroughs. Existing controls/browser tests reflect the welcome entry and automatically opened board controls.
- `.gitignore`: excludes local reference inspection files in `.tmp`.

## Flow

1. Read the short welcome screen and select **Start Game**.
2. Enter 2–4 names and choose the starting player. The guide can be skipped immediately for manual setup.
3. Build five connected tiles. The centre hex has a translucent resource preview; yellow markers suggest a location. Students still choose every garden tile, including all three resources, and must satisfy the existing non-linear garden rule. Undo remains available.
4. Guided setup places one demonstration hive using `placeHive`, with the same validation as manual placement. Students place the other three. Skipping before this stage leaves all four placements manual; skipping afterwards retains the valid example hive.
5. Place the forager bee and beekeeper, each with a translucent model at a suggested starting tile. The established bee-first placement order is retained. Review the completed setup and select **Start First Round**.
6. Roll the actual die, read the matching ecological explanation and event result, then complete any free garden placement. Choose two different action categories. Movement destinations come from the existing selectors; weather restrictions and unavailable moves are explained. The guide introduces collected resources and available trades without requiring an unaffordable trade.
7. Hand over to the next player and guide the rest of the first round. Only when the engine advances the round number does **Continue Playing** finish the tutorial.
8. Use **Help** to review objectives, roles, protections, recipes and the current stage, or restart guidance at the current game state.

## Rules and references

The supplied GTAC Brand and Style Guide v1.02 (March 2025), pages 12–17 and 19, confirms the requested palette, secondary-school Chlorophyll Green emphasis and Figtree typography. The supplied Transporter screenshots informed the rounded Emerald borders and Mint learning panels. The 13-second Introduction Tour video informed cream cards beside focused controls and dimmed surroundings. Transporter-specific instructions, budgets, pollinator counts and scoring were not imported into this game.

The repository's confirmed rules take precedence over simplified examples in the redesign request: each named player takes a turn before a round ends; each turn allows two **different** action categories; victory requires 10+ points in **held** honey and bee bread at turn end. Loss remains immediate at zero healthy hives. Tile supply, placement restrictions, movement, event probabilities and targets, damage, protections, recipes, scoring, passing, reset and save/resume behaviour are unchanged.

## Local testing

```sh
npm install
npm run dev
```

Open the localhost URL printed by Vite. Select Start Game and follow the guide. If a saved game exists, use its existing New Game confirmation to begin setup, or resume it and restart the guide from Help. To test manual setup, skip the guide before placing hives. Try an invalid five-tile resource mix or straight-line garden and use Undo to correct it.

```sh
npm run check
npm run test:browser
npm run build -- --base=/a-game-of-hives/
```

Browser tests use the configured desktop and 820×1180 touch-tablet profiles. Install Playwright Chromium if needed with `npx playwright install chromium`. Onboarding screenshots are written under `test-results/`.

Validation: 84 unit/integration tests and all 18 desktop/tablet browser tests pass. Standard and GitHub Pages subpath production builds pass; the subpath build correctly rewrites the local Figtree URL.

## Limits

- Tutorial progress is intentionally separate from saved games and is not persisted. Reload preserves the actual game; resume and use Help to restart guidance at that stage.
- Restarting the tutorial explains the current state; it does not recreate setup or undo strategic choices. Start a new game to repeat the complete setup.
- Guidance can be skipped at any time. A missing or offscreen spotlight target falls back to the viewport card; Show me where scrolls to an available target, and ordinary game controls remain accessible.
- Desktop and tablet Chromium are automated; physical-device, Safari and screen-reader classroom trials remain useful follow-up checks.
- The production build retains Vite's warning about the size of the lazy-loaded Three.js scene bundle. No additional runtime packages were added. Font and board status badges no longer need external font services.
