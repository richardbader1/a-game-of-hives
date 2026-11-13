# Dice effects

The effects are presentation only. The existing store still selects the die face,
resolves its consequences once, and commits the pending roll when the 3D die
finishes. `DiceEffectsManager` listens for that new committed `eventNotice`;
it never rolls dice, spends resources, damages pieces or writes saves.

## Playback

| Existing event | Visual effect | Duration |
| --- | --- | --- |
| `movementRestriction` (and legacy `extremeWeatherDamage`) | Extreme Weather: clouds, rain and wind | 4.2 s |
| `varroa` | Varroa Mite: crawling sprites | 4.2 s |
| `climate` | Climate Change: thermometer, warm tint and heat distortion | 4.4 s |
| `pesticides` | Pesticides: walking/spraying character and mist | 5 s |
| `garden` | Improvement: two confetti bursts | 4 s |

The current six-face mapping and its two garden-growth faces are unchanged.
Confetti only celebrates an improvement when a free garden placement is actually
available. A before/after comparison identifies genuinely damaged or removed
tiles and hives for target highlights; protected events do not invent targets.

`src/components/effects/` contains the manager, board overlay, sprite cache,
effect types, drawing helpers and separate painters in `renderers/`.
`BoardEffectsPass` projects affected hexes into screen space. For Climate Change
it temporarily renders through the existing Three.js postprocessing classes and
a small heat shader; board geometry, piece coordinates and hitboxes stay unchanged.
No packages were added.

The Canvas overlay stays within the board's stacking context, ignores pointer
events, scales with the board, caps device pixel ratio at 1.5 and paints at up to
30 fps. Small screens use fewer particles. Reduced motion replaces animation
with a static event cue and disables the heat shader. Playback has an independent
deadline, clears timers/frames/render targets on cleanup, cancels on a new roll or
reset, and ignores duplicate commits. Loading a saved outcome does not replay it.

## Assets

The supplied PNGs are copied unchanged into `public/assets/dice-effects/`:

| Sheet | Dimensions | Layout |
| --- | --- | --- |
| Varroa mite | 1536 × 1024 | 3 × 2; six 512 × 512 frames |
| Thermometer | 840 × 1215 | 4 × 3; twelve 210 × 405 frames |
| Sprayer walking | 1404 × 268 | six declared 234 × 268 cells |
| Sprayer spraying | 1404 × 272 | six declared 234 × 272 cells |

All have alpha transparency. Asset URLs respect Vite's deployment base path.
The supplied sprayer artwork is not aligned to its declared cells and some edge
poses are truncated. Runtime crops use intact poses, align foot positions, and
repeat an adjacent intact pose where necessary. A clean export with six complete,
equally spaced poses would improve the animation cycle. The original files in
`public/assets/` are retained unchanged.

## Preview and validation

1. Run `npm install` if dependencies are not already installed, then `npm run dev`.
2. Open the printed local URL with `/?effectsPreview=1` appended. This development
   preview uses a separate fixture board and cannot change a saved game. Play any
   of the five effects, replace it with another, or select **Stop effect**.
3. Open the regular game, finish setup (or resume), and roll. The matching effect
   starts after the die settles. Check that controls still work during playback.
4. Enable reduced motion in the operating system or browser developer tools to
   check the static alternative. Resize or use a tablet viewport during playback.

Run `npm run check` for unit/integration tests and a production build, and
`npm run test:browser` for desktop/tablet browser checks. The effects tests cover
event mapping, damage targeting, sprite bounds, stationary thermometer rendering,
sprayer staging, duplicate/cancel handling, unchanged saves, reduced motion and
independent previews. The preview route is unavailable in production.
