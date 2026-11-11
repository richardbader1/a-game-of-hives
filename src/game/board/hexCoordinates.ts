import type { HexCoord } from '../types';

export const HEX_DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function hexKey({ q, r }: HexCoord): string {
  return `${q},${r}`;
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

export function areAdjacent(a: HexCoord, b: HexCoord): boolean {
  return hexDistance(a, b) === 1;
}

export function neighbors(coord: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map(({ q, r }) => ({
    q: coord.q + q,
    r: coord.r + r,
  }));
}

export function areCollinear(coords: readonly HexCoord[]): boolean {
  if (coords.length < 3) return true;

  const first = coords[0];
  const second = coords[1];
  const deltaQ = second.q - first.q;
  const deltaR = second.r - first.r;

  return coords.every((coord) => {
    const q = coord.q - first.q;
    const r = coord.r - first.r;
    return q * deltaR === r * deltaQ;
  });
}
