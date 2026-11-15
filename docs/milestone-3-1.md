# Milestone 3.1 — tutorial and resource interface

Implemented on `Milestone-3`, using the supplied milestone prompt in Downloads
(the requested `docs/A_Game_of_Hives_Milestone_3_1_VSCode_Prompt.md` was absent).
Reviewed the DOCX text and all six embedded reference images. The references
inform the interface; none of their stock/watermarked artwork is shipped.

## Result

1. The garden guide is docked in the existing setup sidebar, outside the board.
   In stacked layouts it flows below the board. It can be minimised. Next visits
   Build your garden → Pollen → Nectar → Water → Place your tiles; Got it closes
   this part of the guide while later onboarding remains active. Back reviews
   earlier text without rewinding the game. Skip and Undo retain their behaviour.
   Resource explanations are one sentence each, shared verbatim with information
   available by hover, focus and tap. Resource steps highlight the selector and
   one matching placed tile without changing the selection or placing a tile.
2. Mouse and touch drags start at a resource selector, show a pointer-following
   badge, raycast the existing hex meshes and outline a legal drop target. Drops
   call the existing `selectResource` and `placeGardenTile` commands. Occupied,
   disconnected, outside-board and cancelled drops place nothing. Pointer capture,
   cancellation, duplicate-release protection and edge scrolling support setup
   without changing the normal board's pan/zoom interactions. Click and keyboard
   placement remain available.
3. The two named board-control/inspection sections are visually hidden during
   normal gameplay. Their original controls, descriptions and metadata remain in
   the accessibility tree and tab order; the area becomes visible while focused
   so a keyboard user can see the destination controls they are using. Existing
   live announcements and game selectors remain intact.
4. Original SVG pollen, botanical nectar and three-wave water symbols are shared
   between setup, the legend, HUD, recipe ingredients and tile textures. Red,
   gold and blue associations, tile geometry, colours and all GLB artwork remain
   intact. Honey, bee bread and hive symbols are retained.
5. The resource strip uses `--resource-hud-scale: 1.25`. Measured icon boxes change
   from 29px to 36.25px and quantity text from 17px to 21.25px at 1920×1080,
   1366×768 and 1024×768. Product glyphs also scale by 1.25. The existing smaller
   mobile baseline is scaled separately. The strip wraps and does not clip its
   recipes or resource information. Recipe cards clamp their layout position to
   the viewport, including at 820px, and touch taps do not invoke mouse-only
   hover dismissal. Only resource help opts into automatic hover/focus previews;
   unrelated help retains its native disclosure behaviour.

The first tile may start anywhere within the existing board boundary. The centre
remains a recommendation, not a new restriction. The original fifth-tile mix and
non-linear-shape checks still happen through the existing setup validation.

## Exact file inventory

Modified:

| File | Purpose |
| --- | --- |
| `src/app/App.tsx` | Scope the setup drag provider; use the same symbols in the existing legend. |
| `src/components/setup/GardenBuilder.tsx` | Guide dock, resource focus, drag entry points, descriptions and feedback. |
| `src/components/ui/Tutorial.tsx` | Five garden steps, docked/collapsible card, Next/Back/Got it, accessible destination guidance. |
| `src/components/scene/IsometricBoard.tsx` | Setup drop picking and instructional/hover target highlights. |
| `src/components/scene/HexTile.tsx` | Hex picking metadata, presentation-only outlines and shared SVG resource textures. |
| `src/components/ui/BoardDestinations.tsx` | Class for hiding the existing accessibility sections until keyboard focus. |
| `src/components/ui/GameHUD.tsx` | Shared resource icons and descriptions in in-game tile choices. |
| `src/components/ui/InventoryToolbar.tsx` | Shared icons/help, recipe symbols, touch-stable recipes and viewport alignment. |
| `src/components/ui/HelpTip.tsx` | Opt-in resource hover/focus help; native behaviour retained for other help. |
| `src/styles/gtac.css` | Dock, focus, drag badge, accessibility visibility, symbol sizing and HUD scale token. |
| `tests/integration/tutorial.test.tsx` | Updated the renamed Next button expectation; rules assertions retained. |
| `tests/browser/onboarding.spec.ts` | Focus/Enter the retained destination controls instead of mouse-clicking hidden controls. |

Added:

| File | Purpose |
| --- | --- |
| `src/components/setup/GardenDrag.tsx` | Presentation-only pointer gesture state, drop command dispatch, cancellation and edge scrolling. |
| `src/components/scene/GardenDropTargets.tsx` | Setup-only raycasting through the existing camera; kept in the lazy scene bundle. |
| `src/components/ui/ResourceIcon.tsx` | One resource icon component and base-path-aware asset URL map. |
| `src/components/ui/resourceDescriptions.ts` | Shared educational sentences and garden-guide focus helpers. |
| `public/assets/resource-icons/pollen.svg` | Original textured pollen-grain vector. |
| `public/assets/resource-icons/nectar.svg` | Original botanical droplet vector. |
| `public/assets/resource-icons/water.svg` | Original three-wave vector. |
| `tests/integration/milestone31.test.tsx` | Tutorial state isolation, shared wording and validated/cancelled drag coverage. |
| `tests/browser/milestone31.spec.ts` | Responsive guide, real mouse/touch placement, recipe, icon and accessibility checks. |
| `docs/milestone-3-1.md` | This report and file inventory. |

Twelve comparison images are added under `docs/previews/milestone-3-1/`:
`before-garden-1920.png`, `after-garden-1920.png`,
`before-garden-1366.png`, `after-garden-1366.png`,
`before-garden-1024.png`, `after-garden-1024.png`,
`before-toolbar-1920.png`, `after-toolbar-1920.png`,
`before-toolbar-1366.png`, `after-toolbar-1366.png`,
`before-toolbar-1024.png`, `after-toolbar-1024.png`.

## Validation and manual review

`npm run check` passes: 111 unit/integration tests, TypeScript checking and the
production Vite build. No lint script is configured. The existing large Three.js
bundle warning remains; no dependency was added or upgraded.

All 34 individual browser scenarios passed across the full regression run and
targeted reruns. `npm run test:browser` initially returned 33 passes and one touch
recipe failure. After that fix, the eight milestone/onboarding checks were rerun;
guide, drag and complete-round checks passed on both profiles. An added 820px
recipe check then caught overflow, which was fixed. The final
`npx playwright test tests/browser/milestone31.spec.ts --grep 'larger resource HUD'`
returned **2/2 passes**, checking hover, focus and tap across 1920, 1366, 1024 and
820px with no horizontal overflow. The full suite was not repeated after these
focused fixes. Tests use desktop Chromium and touch-enabled tablet Chromium,
including real touch-event drags through CDP. The existing onboarding test
completes setup and a full first round; other regressions cover the die faces,
consequences, trading, scoring, saves, models and camera gestures.

The Git change summary is 12 modified files and 22 added files (34 total),
including the twelve before/after images. `git diff --check` passes. Both the
standard build and `npm run build -- --base=/a-game-of-hives/` pass; the deployed
resource icon URLs and all three copied SVGs were checked in the output.

To review locally, run `npm run dev`, open its local URL, select Start Game and
enter names. Follow Next through the garden guide, try Back/minimising, then
choose Got it. Try both click and drag placement, an occupied/disconnected drop,
Undo and the keyboard placement controls. In gameplay, Tab to the retained board
alternatives and try resource help and all three product recipes by hover, focus
and tap. Comparison images show the original and updated layouts at all three
requested sizes.

Gameplay rules, probabilities, scoring, resource calculations, starting inventory,
serialisable state, save format, GLB models, piece positions, camera behaviour,
dependencies and deployment configuration were not changed. No commit, push or
deployment was performed. Physical-device Safari and assistive-technology trials
remain manual follow-up checks; browser touch simulation is not a substitute for
those platform checks.
