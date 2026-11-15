import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Raycaster, Vector2 } from 'three';
import { useGardenDrag } from '../setup/GardenDrag';

/** Raycast existing hex meshes using the unchanged camera and coordinates. */
export function GardenDropTargets() {
  const { camera, scene, gl } = useThree();
  const { register } = useGardenDrag();
  useEffect(() => {
    const ray = new Raycaster(), pointer = new Vector2();
    return register((x, y) => {
      const rect = gl.domElement.getBoundingClientRect();
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
      pointer.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1);
      camera.updateMatrixWorld(); scene.updateMatrixWorld(true); ray.setFromCamera(pointer, camera);
      return ray.intersectObjects(scene.children, true).find(hit => hit.object.userData.gardenCoord)?.object.userData.gardenCoord ?? null;
    });
  }, [camera, scene, gl, register]);
  return null;
}
