# A Game of Hives — Coloured 3D Models

These models were converted from the three source files you supplied and given new stylised colour palettes. **The source models did not contain finished colours or textures**; colours have been newly applied to mesh vertices, not recovered from the originals. The original geometry has been preserved in appearance, with polygon reduction for web use.

## Files

Copy the files from `public/models/` to the `public/models/` directory in your Vite project.

| Game piece | Recommended model | Higher-detail option |
| --- | --- | --- |
| Bee | `bee.glb` | `bee_detailed.glb` |
| Beekeeper gnome | `beekeeper.glb` | `beekeeper_detailed.glb` |
| Hive (traditional round skep) | `hive.glb` | `hive_detailed.glb` |

Use the smaller recommended models initially, especially for school laptops/tablets. The preview PNGs show the detailed-colour versions. The detailed alternatives may show smoother contours at close zoom.

## Current appearance

- Bee: yellow body, brown stripes/legs, dark eyes, pale blue wings, rosy tongue.
- Beekeeper: this source is a whimsical garden gnome, not a conventional suited beekeeper. Coloured with a green hat, teal coat, pale beard, tan sleeves and brown boots.
- Hive: golden straw-like skep with shaded ring bands and a dark front entrance. It is **not a rectangular wooden hive**.

These are starting palette choices and can be adjusted in Blender or a 3D editing workflow.

## Coordinate and scale preparation

- Files are transformed to **Three.js Y-up**, with the base touching Y=0.
- They are horizontally centred around X=0, Z=0.
- Characters and hive face towards **positive Z** in their local coordinate system.
- Each model is approximately sized for a board with a hexagon diameter around 1.5 to 2.0 world units. You may still need to adjust scale to fit your existing `HexTile.tsx` geometry.
- No animation rigs or baked animations are present in the uploaded geometry. You can animate position, rotation and bobbing in React Three Fiber; articulated wing flapping/walking requires separating/rigging parts as needed.

## Quick loading example

```tsx
import { Clone, useGLTF } from '@react-three/drei';

export function GameBee() {
  const { scene } = useGLTF('/models/bee.glb');
  return <Clone object={scene} castShadow receiveShadow />;
}

useGLTF.preload('/models/bee.glb');
```

For beekeepers use `/models/beekeeper.glb`; for repeated hives use `/models/hive.glb`. `Clone` makes separate scene instances while sharing heavy geometry and textures between copies. Avoid sharing a single mutable scene object across multiple hive components.

The components are a graphical replacement only. Keep existing selectable groups, game state, tile positioning, movement and click handlers intact when connecting the models.

## Important caveats

- Colours are **vertex colours embedded in GLB**, not texture images, and should display in modern glTF-compatible viewers and Three.js. Avoid replacing the imported GLB material with a new material that has `vertexColors` disabled.
- Precise paint boundaries on the single-mesh gnome and hive are approximations. For production-quality hand-painted details, refine them in Blender using material regions or texture painting.
- The source assets appear to have no skeletons or embedded animations.
- If the game uses a different world-unit scale, adapt the rendering transform once in a wrapper rather than editing the model files.

## Recommended integration checks

1. Bee, beekeeper and hive are visible, upright, appropriately scaled and facing the expected direction.
2. Their colours remain visible with the game's real scene lighting.
3. The player can still select and move each piece; overlapping GLB meshes do not break hex clicks.
4. At least 12 placed hives can render at acceptable frame rates on an ordinary school laptop.
5. Damaged/healthy statuses and improvement markers remain identifiable with the new models.
6. Touch interaction and camera zoom work without unwanted model selection.
