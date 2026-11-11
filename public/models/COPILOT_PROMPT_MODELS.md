# VS Code Copilot prompt — Milestone 3: Integrate new coloured models

Read `README_IMPORT.md` and inspect the current scene components (`Bee`, `Beekeeper`, `Hive`, `HexTile` and the game board). Replace **only the rendered placeholder meshes** with the prepared GLB assets in `public/models/`:

- `bee.glb` for the bee,
- `beekeeper.glb` for the beekeeper,
- `hive.glb` for every hive.

Preserve all interaction and game rules from Milestones 1, 2 and 2.5. Do not modify game-state logic, movement validity, resource management, scoring or events. Preserve existing selection handlers and highlights, and ensure clicks/taps on the models still select their game pieces. Set GLB render positions on top of the tile, preserving the model origin at the base. The supplied models use Y-up and face +Z.

For multiple hive instances, use Drei `Clone` or correctly cloned `Object3D` instances and share geometry/material where possible. Preload GLBs with `useGLTF.preload`, add shadow behaviour without performance regressions, and avoid replacing the GLB's vertex-colour materials. Adjust a consistent scale and orientation in model wrappers only if required by current tile sizes.

Test the scene at normal zoom, maximal garden expansion and with 10–15 hives. Confirm that healthy/damaged states and improvements remain identifiable; use visual effects or indicators rather than modifying the gameplay engine. Keep model-dependent animation simple (gentle bee hovering, beekeeper idle sway); no skeleton rigs are provided. Maintain good performance and support mouse/touch interactions.

Initially use the lightweight files, and keep higher-detail `_detailed.glb` files available for comparison only. Run build/tests and describe exactly which files and components were changed, with visual previews if possible.
