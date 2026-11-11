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

The playable loop includes:

- Two to four named players, a connected five-tile starting garden, four starting hives, and bee/beekeeper placement.
- Dice events, random targeting, tile and hive damage, protections, repairs, and destruction/relocation.
- Straight-line bee and beekeeper movement, resource collection, garden expansion, and two different actions per turn.
- Shared inventory, unlimited affordable trading, immediate hive placement during a hive purchase, and held-product scoring.
- End-of-turn victory and immediate defeat checks, plus an inspectable event/action history.
- Full-screen strategy layout with a large isometric board, mouse/touch pan and zoom, reset-to-fit framing, and persistent inventory/recipe controls.

Mouse and touchscreen tile selection are supported. Product recipes are available by hover, click, or keyboard focus; purchasing remains restricted to the trading phase. Engine rules are implemented as serialisable TypeScript transitions and are tested independently from React and Three.js. Browser save/resume is not yet implemented.

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