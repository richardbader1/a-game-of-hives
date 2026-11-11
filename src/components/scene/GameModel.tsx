import { Clone, useGLTF } from '@react-three/drei';
import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { Mesh, MeshStandardMaterial } from 'three';

/** Use the Vite base so models also load from a GitHub Pages repository subpath. */
export const MODEL_URLS = {
  bee: `${import.meta.env.BASE_URL}models/bee.glb`,
  beekeeper: `${import.meta.env.BASE_URL}models/beekeeper.glb`,
  hive: `${import.meta.env.BASE_URL}models/hive.glb`,
} as const;

export type ModelKind = keyof typeof MODEL_URLS;

export function GameModel({ kind }: { kind: ModelKind }) {
  const { scene, parser } = useGLTF(MODEL_URLS[kind]);
  const invalidate = useThree(state => state.invalidate);
  useLayoutEffect(() => {
    // These files omit materials. glTF's implicit metallic=1 makes their painted vertices dark
    // without an environment map. Tune that implicit material; retain its colours and sharing.
    // Leave authored materials in any future replacement GLB untouched.
    if (parser.json.materials?.length) return;
    scene.traverse(object => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const surface = material as MeshStandardMaterial;
        if (surface.isMeshStandardMaterial && surface.metalness !== 0) {
          surface.metalness = 0;
          surface.roughness = 0.85;
          // Balance these vertex-painted pieces under the board's existing bright lighting.
          surface.color.setScalar(0.45);
          surface.needsUpdate = true;
        }
      }
    });
    invalidate();
  }, [scene, parser, invalidate]);
  // Independent transforms share loaded geometry and vertex-colour materials.
  // Unmounting one hive must not dispose the other hives' cached resources.
  return <Clone object={scene} castShadow receiveShadow dispose={null} />;
}

for (const url of Object.values(MODEL_URLS)) useGLTF.preload(url);
