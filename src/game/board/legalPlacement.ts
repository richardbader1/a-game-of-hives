import { hexKey, neighbors } from './hexCoordinates';
import type { GardenTile, HexCoord } from '../types';

export function isAdjacentToGarden(coord: HexCoord, tiles: readonly GardenTile[]): boolean {
  return tiles.some((tile) => neighbors(tile).some((neighbor) => hexKey(neighbor) === hexKey(coord)));
}

export function isGardenPlacementLegal(
  coord: HexCoord,
  tiles: readonly GardenTile[],
  boardRadius = 3,
): boolean {
  if (Math.max(Math.abs(coord.q), Math.abs(coord.r), Math.abs(coord.q + coord.r)) > boardRadius) {
    return false;
  }
  if (tiles.some((tile) => hexKey(tile) === hexKey(coord))) return false;
  return tiles.length === 0 || isAdjacentToGarden(coord, tiles);
}
