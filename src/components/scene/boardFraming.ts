import type { HexCoord } from '../../game/types';

export const CAMERA_FRAME = 5.2;
// Orthographic scale is independent of distance. Keep the finite garden in front of the near plane.
export const CAMERA_OFFSET = { x: 80, y: 100, z: 90 };
const rightX = 9 / Math.sqrt(145);
const rightZ = -8 / Math.sqrt(145);
const upX = -80 / Math.sqrt(145 * 245);
const upZ = -90 / Math.sqrt(145 * 245);
const upY = Math.sqrt(145 / 245);

export interface ViewportArea { left: number; top: number; width: number; height: number }

/** Fit in camera space, including token height and space for adjacent placements. */
export function fitBoard(coords: readonly HexCoord[], width: number, height: number, area: ViewportArea) {
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const coord of coords.length ? coords : [{ q: 0, r: 0 }]) {
    const x = Math.sqrt(3) * (coord.q + coord.r / 2), z = 1.5 * coord.r;
    for (const dx of [-1.8, 1.8]) for (const dz of [-1.8, 1.8]) for (const y of [-0.5, 1.5]) {
      const u = (x + dx) * rightX + (z + dz) * rightZ;
      const v = (x + dx) * upX + (z + dz) * upZ + y * upY;
      minU = Math.min(minU, u); maxU = Math.max(maxU, u);
      minV = Math.min(minV, v); maxV = Math.max(maxV, v);
    }
  }
  const zoom = Math.min(2.4, Math.min(area.width / (maxU - minU), area.height / (maxV - minV)) * (2 * CAMERA_FRAME / Math.max(height, 1)));
  const pixelsPerUnit = Math.max(height, 1) * zoom / (2 * CAMERA_FRAME);
  const u = (minU + maxU) / 2 - (area.left + area.width / 2 - width / 2) / pixelsPerUnit;
  const v = (minV + maxV) / 2 + (area.top + area.height / 2 - height / 2) / pixelsPerUnit;
  const determinant = rightX * upZ - rightZ * upX;
  return { zoom, x: (u * upZ - rightZ * v) / determinant, z: (rightX * v - u * upX) / determinant };
}
