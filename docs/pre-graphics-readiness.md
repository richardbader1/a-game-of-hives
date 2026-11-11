# Pre-graphics readiness

This work brings reliability, accessibility, persistence and delivery checks forward from later milestones. Placeholder characters and the existing visual direction remain in place. Recipes, supplies, event probabilities and held-score victory are unchanged. Evacuation fallback and starter-relative rounds are recorded in `implementation-conventions.md`.

## Implemented

- Starter-relative rounds, recoverable bee evacuation, phase/terminal guards and setup revalidation.
- Pure setup transitions and fresh initial snapshots, central product recipes/costs/scores and shared legal-destination selectors.
- Separate inventory, trading, board-control and help components; focused inventory/trade subscriptions.
- DOM alternatives for every gameplay destination, textual board inspection, resource shape markers and persistent event/error feedback.
- Versioned started-game autosaves, explicit resume/replacement, transactional-state restoration and graceful storage/save failures.
- Camera-space board framing around overlays, depth-safe camera distance, bounded pan, demand rendering and disposed outline geometry.
- Unit, store, DOM and Chromium desktop/tablet tests; CI and a manually triggered Pages deployment workflow.

## Run validation

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

On a Linux CI host, use `npx playwright install --with-deps chromium` to install required OS libraries. Browser screenshots/traces are written to ignored `test-results/`. Pure and DOM tests cover rules and save invariants. Browser checks cover manual setup, committed-action resume, pending hive purchases, invalid saves and long-garden camera gestures on desktop and touch-enabled tablet viewports. They are not a substitute for physical-device or classroom testing.

## Human validation before changing balance or finalising graphics

1. Run a complete session with a group aged 10–12. Record setup time, total turns, session duration, result and points where adult help was needed.
2. Ask students to explain held points, the cost of a new hive, the immediate loss rule and each protection. Record misunderstandings before adjusting copy or tutorial design.
3. Confirm the existing voluntary-pass policy with the designer. Do not change it or rebalance recipes/events based on speculation.
4. Try a real school laptop and tablet, including portrait/landscape, keyboard-only play, screen-reader output and reduced-motion settings. Check pointer targeting, overlay scrolling and text size.
5. Profile frame times and memory on those devices with all 18 tiles and multiple structures. Demand rendering reduces idle work; no hardware performance target has yet been measured. The lazy-loaded Three.js board bundle still produces Vite's large-chunk warning.
6. Verify the configured Pages workflow in the intended GitHub repository and inspect the published subpath. Local checks do not prove repository permissions or hosting settings.

## Next graphical milestone

Replace primitive models with stylised assets and add purposeful movement, collection, damage and protection feedback. Preserve the engine boundaries and keyboard controls. Profile the real assets before adding quality settings or further renderer optimisation. Keep animations compatible with demand rendering and reduced motion.
