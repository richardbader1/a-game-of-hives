# A Game of Hives

A cooperative isometric garden game for students aged 10–12. Players build a shared garden, respond to environmental events, collect resources, protect and repair hives, trade products and work toward saving the queen bee.

## Run locally

```sh
npm install
npm run dev
```

Run the automated setup and game-engine tests and production build with:

```sh
npm test
npm run build
```

For browser checks (desktop and touch-enabled tablet Chromium):

```sh
npx playwright install chromium
npm run test:browser
```

On Windows PowerShell, use `npm.cmd` / `npx.cmd` if execution policy blocks the `.ps1` launchers.

The playable loop includes:

- Two to four named players, a connected five-tile starting garden, four starting hives, and bee/beekeeper placement.
- Dice events, random targeting, tile and hive damage, protections, repairs, and destruction/relocation.
- Straight-line bee and beekeeper movement, resource collection, garden expansion, and two different actions per turn.
- Shared inventory, unlimited affordable trading, immediate hive placement during a hive purchase, and held-product scoring.
- End-of-turn victory and immediate defeat checks, plus an inspectable event/action history.
- Full-screen strategy layout with a large isometric board, mouse/touch pan and zoom, reset-to-fit framing, and persistent inventory/recipe controls.

Mouse and touchscreen tile selection are supported. The expandable **Board controls** provide keyboard and screen-reader alternatives for movement, garden expansion, hive purchases and tile inspection. Tiles have distinct resource markers as well as colour. Product recipes are available by hover, click, or keyboard focus; purchasing remains restricted to the trading phase. **How to play** explains the turn sequence, protections and recipes.

Started games autosave on the current browser/device. Reloading offers **Resume saved game** or a confirmed **New Game**. Resuming preserves dice events, action slots, locked beekeeper destinations and pending hive placements. Setup before starting the first turn is not saved. Unsupported/corrupt saves and blocked/full storage show a message without preventing a new game. Browser storage can be cleared by the browser; saves are not synced across devices.

Both setup and gameplay use pure, serialisable TypeScript transitions. Recipes and product scores live in `src/game/data/products.ts`; legal board destinations live in `src/game/selectors.ts`; versioned save validation lives in `src/game/persistence/saveGame.ts`. The Zustand store dispatches these rules. Inventory, trading, help and keyboard board controls are separate components. The 3D scene renders on demand, and Reset view fits the projected board around the controls.

## Milestone 3: supplied models

The bee, beekeeper gnome and round skep hive now use the lightweight coloured GLBs in `public/models/`. Higher-detail alternatives remain available for comparison and are not loaded by the game. Model clicks/taps use the existing tile-selection handlers. A red **!** badge/ring indicates hive damage; a green **✓** badge indicates a smart hive, including when that hive is damaged.

The bee hovers gently and the beekeeper sways using a shared 20 Hz animation clock. Reduced-motion preferences, hidden tabs and offscreen boards pause idle animation; setup without characters stays on demand. See [model integration, changed files and previews](docs/milestone-3-models.md) for implementation details and validation.

## Checks and publication

GitHub Actions runs unit/integration tests, a production build, and desktop/tablet browser checks on pushes and pull requests. To publish, choose **GitHub Actions** as the repository's Pages source, then manually run **Publish to GitHub Pages** for the intended branch. That workflow checks and builds the selected revision before deploying it. Configuring the workflow does not publish the local working copy.

The Vite base path uses the repository name in GitHub Actions, including root hosting for a `*.github.io` repository. See [pre-graphics readiness and classroom checks](docs/pre-graphics-readiness.md) for remaining human validation before the graphical milestone.

## Sources and precedence

1. `docs/confirmed-decisions.md` records the game designer's resolved decisions.
2. `docs/game-rules.md` is the developer-readable digital rules reference.
3. `references/Bee game 1 page intructions V1.2.pptx` contains the authoritative one-page physical-game rules.
4. `references/A Game of Hives - Print and Play Editon.pdf` provides original visual components and physical supply quantities. The PDF's pollen/nectar colour mapping is outdated relative to V1.2.

## Target stack

Vite, React, TypeScript, Three.js, React Three Fiber, Drei, Zustand and Vitest; deploy a static build to GitHub Pages.

## Design rule

Keep the game engine independent from React/Three.js. Preserve all game decisions in configuration and pure, testable rules.
## Development

Active development takes place on the development branch.
The v1.2 release is preserved as a Git tag.
