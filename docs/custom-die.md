# Custom glossy GTAC die

## Approved outcome mapping

On 13 November 2026 the designer explicitly confirmed the new die's mapping, resolving its conflict with the earlier six-outcome implementation:

| Result | GLB face | Outcome |
| --- | --- | --- |
| 1 | +X, Varroa Mite | Existing random-hive damage, including smart-hive protection |
| 2 | −Z, Climate Change / Habitat Loss | Existing tile damage, destruction, protection and resource-loss rules |
| 3 | +Y, Pesticides | Water-only collection this turn, except at no-spray zones |
| 4 | +Z, Extreme Weather | Bee movement prohibited this turn |
| 5 | −X, Improvement | One free garden placement before normal actions |
| 6 | −Y, Improvement | The same free garden placement |

All six faces remain equally likely (1/6); Improvement has a combined probability of 2/6. Weather hive damage is no longer generated. `extremeWeatherDamage` remains a valid already-resolved result in legacy saves; it is neither rerolled nor undone.

## Implementation

- `src/game/config/dice.ts`: shared event mapping and animation/notification durations.
- `src/game/engine/gameEngine.ts`: uses that mapping with the existing roll and effect resolver. Random target selection and every individual effect implementation remain unchanged.
- `src/store/gameStore.ts`: `startDiceRoll` calls the existing pure resolver once and holds its returned snapshot as a pending transaction. The visible board and serialised game remain unchanged while tumbling. `completeDiceRoll(id)` commits once, then publishes the engine's exact result message. Duplicate requests and stale completions after reset are ignored. This uses the existing store, not a second gameplay state system.
- `src/components/scene/DiceCanvas.tsx`, `diceOrientation.ts` and `diceTabletopMotion.ts`: load the GLB using React Three Fiber/drei and the Vite base path. Authored textures, colours, geometry, roughness, metalness and clearcoat are preserved. Locally generated Lightformer reflections require no external HDR downloads. The selected symbol is the dominant upper face, with less prominent side faces and a brief board-only “Landed: …” label. Animation never makes another random draw. The canvas unmounts after settling.
- `src/components/ui/DicePanel.tsx`, `useReducedMotion.ts`: the idle panel contains only a heading and Roll Dice button, with no image, canvas or reserved preview space. The model is cached in the background without displaying it. Pressing the button mounts a transparent canvas over the garden, travelling for 2.6 seconds with deceleration, diminishing bounces, a soft ground shadow and a final rock. The result rests on the board for one second with its label before applying the effect (3.6 seconds total after the model mounts). The board is brought into view, and the overlay follows its bounds through resizing and scrolling. It does not capture mouse/touch input or move any board pieces. Reduced motion reveals a stationary, labelled result on the garden for 800ms. A render/load error falls back to the corresponding face artwork while the game can continue. This is a scripted tabletop animation, not a physics simulation; it preserves the existing uniform result selection.
- `src/components/ui/EventNotice.tsx`: one centred, non-interactive, accessible status card after commitment. It uses the supplied texture atlas for its icon and the engine's actual message, including blocked effects, destruction, evacuation or resource loss. Timings: 250ms fade in, 2.5-second hold, 350ms fade out; reduced motion removes fades. Replacement and unmount clear old timers.
- `src/styles/dice.css`, `src/app/main.tsx`: scoped GTAC styling and local atlas URL handling.
- `src/components/ui/GameHUD.tsx`, `src/app/App.tsx`, `GameHelp.tsx`, `Tutorial.tsx`: replace the old event panel, mount the temporary message, update Help, and pause tutorial cards during rolls/notifications. Normal guided play continues automatically afterwards. Free-tile resource controls live outside the minimal dice panel. Event logs remain in engine snapshots but the historical-roll display and persistent dice-effect descriptions are removed.
- `tests/unit/dice.test.ts`, `tests/integration/diceRoll.test.tsx`, `tests/browser/dice.spec.ts`: mapping/probability boundaries, GLB metadata, all six orientations, delayed/idempotent application, notification lifecycle, protection feedback, reset/unmount, reduced motion, actual WebGL loading, real tumbling and mouse/keyboard/touch input. Existing browser tests distinguish the board canvas from the new die canvas.

No runtime dependencies were added. The supplied GLB is standalone; the supplied PNG atlas is also used for notification icons and the error fallback. The supplied README and preview remain alongside the asset, unchanged.

## Test locally

```sh
npm run dev
npm run check
npm run test:browser
```

Start or resume a game, skip the tutorial if desired, and press **Roll Dice**. Confirm the board does not change during the tumble, the settled symbol matches the temporary notice, and the notice disappears automatically. Finish the turn to roll again. For a guided game, the tutorial pauses during the notification and continues with the relevant action or free placement.

```sh
npx playwright test tests/browser/dice.spec.ts
npm run build -- --base=/a-game-of-hives/
```

Browser tests cover desktop and touch-tablet Chromium and write six face screenshots per project under `test-results/`.

The dice suite also verifies that the idle panel has no die preview, that a normal throw moves across a board-sized overlay, that the board remains unchanged during travel, and that the die disappears completely after settling. All six landed symbols are checked for their dominant upward orientation. The motion unit test checks bounds, deceleration, bounces and the final resting position. Vite retains the existing warning about the shared Three.js bundle size.

Board-only die and landing-face validation: all 99 unit/integration tests, all 22 desktop/tablet browser tests and the production build pass. This includes a fast first click before the lazy garden mounts, no idle preview, all six upper-face orientations, and complete removal of the die after resolution.

## Behaviour on interruption

Reset cancels a pending roll. Reloading during a tumble restores the last committed, pre-roll save; no partial event is saved or applied. Reloading after settlement preserves the resolved outcome and never reapplies it. Notification and animation progress themselves are transient and are not saved. Hidden tabs may delay browser timers; the pending transaction still commits at most once. Safari and physical-device classroom testing remain manual follow-up checks.
