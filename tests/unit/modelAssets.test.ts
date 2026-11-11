import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Box3, Vector3, type Mesh, type MeshStandardMaterial } from 'three';
import { GLTFLoader, type GLTF } from 'three-stdlib';

describe('supplied game models', () => {
  it.each([
    { kind: 'bee', triangleBudget: 30000, height: 0.611 },
    { kind: 'beekeeper', triangleBudget: 45000, height: 1.165 },
    { kind: 'hive', triangleBudget: 9000, height: 0.558 },
  ])('loads the lightweight $kind with its vertex colours and base origin', async ({ kind, triangleBudget, height }) => {
    const bytes = readFileSync(`public/models/${kind}.glb`);
    expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
    expect(bytes.readUInt32LE(4)).toBe(2);
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const gltf = await new Promise<GLTF>((resolve, reject) => new GLTFLoader().parse(data, '', resolve, reject));
    const bounds = new Box3().setFromObject(gltf.scene);
    expect(bounds.min.y).toBeCloseTo(0, 3);
    expect(bounds.getSize(new Vector3()).y).toBeCloseTo(height, 2);
    expect(Math.abs(bounds.getCenter(new Vector3()).x)).toBeLessThan(0.05);
    expect(gltf.animations).toHaveLength(0);
    let triangles = 0, meshes = 0;
    gltf.scene.traverse(object => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      meshes++;
      const geometry = mesh.geometry;
      triangles += (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;
      expect(geometry.getAttribute('color')).toBeTruthy();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) expect((material as MeshStandardMaterial).vertexColors).toBe(true);
    });
    expect(meshes).toBeGreaterThan(0);
    expect(triangles).toBeGreaterThan(100);
    expect(triangles).toBeLessThanOrEqual(triangleBudget);
    expect(existsSync(`public/models/${kind}_detailed.glb`)).toBe(true);
  });
});
