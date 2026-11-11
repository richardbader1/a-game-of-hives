import { areAdjacent, areCollinear, hexKey } from '../board/hexCoordinates';
import type { GardenTile, Player, SetupValidation } from '../types';

export function validatePlayers(players: readonly Player[]): SetupValidation {
  const errors: string[] = [];
  if (players.length < 2 || players.length > 4) {
    errors.push('Add between 2 and 4 players.');
  }
  if (players.some((player) => player.name.trim().length === 0)) {
    errors.push('Enter a name for every player.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateStartingGarden(tiles: readonly GardenTile[]): SetupValidation {
  const errors: string[] = [];
  if (tiles.length !== 5) {
    errors.push('Place exactly five garden tiles.');
  }

  const keys = new Set(tiles.map(hexKey));
  if (keys.size !== tiles.length) {
    errors.push('Each garden tile must occupy a different space.');
  }

  if (!['pollen', 'nectar', 'water'].every((resource) =>
    tiles.some((tile) => tile.resource === resource),
  )) {
    errors.push('Include at least one pollen, nectar and water tile.');
  }

  if (!isConnected(tiles)) {
    errors.push('All five garden tiles must touch in one connected garden.');
  }

  if (tiles.length === 5 && areCollinear(tiles)) {
    errors.push('The starting garden cannot be one straight line.');
  }

  return { valid: errors.length === 0, errors };
}

function isConnected(tiles: readonly GardenTile[]): boolean {
  if (tiles.length === 0) return true;

  const remaining = new Set(tiles.map(hexKey));
  const queue = [tiles[0]];
  remaining.delete(hexKey(tiles[0]));

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    for (const tile of tiles) {
      const key = hexKey(tile);
      if (areAdjacent(tile, current) && remaining.delete(key)) queue.push(tile);
    }
  }

  return remaining.size === 0;
}

export function validateHivePlacement(
  tiles: readonly GardenTile[],
  hiveTileIds: readonly string[],
): SetupValidation {
  const errors: string[] = [];
  if (hiveTileIds.length !== 4) errors.push('Place four starting hives.');
  if (new Set(hiveTileIds).size !== hiveTileIds.length) {
    errors.push('Each starting hive must be on a different tile.');
  }
  if (hiveTileIds.some((id) => !tiles.some((tile) => tile.id === id))) {
    errors.push('Every hive must be placed on a garden tile.');
  }
  return { valid: errors.length === 0, errors };
}
