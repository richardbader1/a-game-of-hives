import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import type { Material, Mesh, MeshStandardMaterial } from 'three';
import { MODEL_URLS, type ModelKind } from './GameModel';

/** A visual suggestion only. Own materials so the real pieces stay opaque. */
export function PlacementPreview({ kind }: { kind: ModelKind }) {
  const { scene } = useGLTF(MODEL_URLS[kind]);
  const { ghost, materials } = useMemo(() => {
    const materials: Material[] = [];
    const ghost = scene.clone(true);
    ghost.traverse(object => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const cloneMaterial = (original: Material) => {
        const material = original.clone() as MeshStandardMaterial;
        material.transparent = true; material.opacity = 0.35; material.depthWrite = false;
        if (material.isMeshStandardMaterial) { material.metalness = 0; material.color.setScalar(0.45); }
        materials.push(material);
        return material;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(cloneMaterial) : cloneMaterial(mesh.material);
      mesh.raycast = () => {}; // Let the tile below receive the placement gesture.
    });
    return { ghost, materials };
  }, [scene]);
  useEffect(() => () => materials.forEach(material => material.dispose()), [materials]);
  return <primitive object={ghost} scale={kind === 'hive' ? 0.9 : kind === 'bee' ? 0.78 : 0.7} dispose={null} />;
}
