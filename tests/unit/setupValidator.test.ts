import { describe, expect, it } from 'vitest';
import { areCollinear, hexDistance } from '../../src/game/board/hexCoordinates';
import { isGardenPlacementLegal } from '../../src/game/board/legalPlacement';
import { validateHivePlacement, validatePlayers, validateStartingGarden } from '../../src/game/engine/setupValidator';
import type { GardenTile, Player } from '../../src/game/types';

const players: Player[] = [
  { id: 'p1', name: 'Ari' },
  { id: 'p2', name: 'Sam' },
];

const garden: GardenTile[] = [
  { id: 'a', q: 0, r: 0, resource: 'pollen' },
  { id: 'b', q: 1, r: 0, resource: 'nectar' },
  { id: 'c', q: 0, r: 1, resource: 'water' },
  { id: 'd', q: -1, r: 1, resource: 'pollen' },
  { id: 'e', q: 1, r: -1, resource: 'water' },
];

describe('setup validation', () => {
  it('accepts two to four named players and rejects other counts or blank names', () => {
    expect(validatePlayers(players).valid).toBe(true);
    expect(validatePlayers([...players, { id: 'p3', name: 'Lee' }, { id: 'p4', name: 'Jo' }]).valid).toBe(true);
    expect(validatePlayers([players[0]]).valid).toBe(false);
    expect(validatePlayers([...players, { id: 'p3', name: 'Lee' }, { id: 'p4', name: 'Jo' }, { id: 'p5', name: 'Max' }]).valid).toBe(false);
    expect(validatePlayers([{ id: 'p1', name: '  ' }, players[1]]).errors).toContain('Enter a name for every player.');
  });

  it('requires exactly five connected tiles with pollen, nectar and water', () => {
    expect(validateStartingGarden(garden).valid).toBe(true);
    expect(validateStartingGarden(garden.slice(0, 4)).errors).toContain('Place exactly five garden tiles.');
    expect(validateStartingGarden(garden.map((tile) => ({ ...tile, resource: 'pollen' }))).errors)
      .toContain('Include at least one pollen, nectar and water tile.');
  });

  it('rejects disconnected starting tiles and duplicate coordinates', () => {
    const disconnected: GardenTile[] = [
      { id: 'a', q: -2, r: 0, resource: 'pollen' },
      { id: 'b', q: -1, r: 0, resource: 'nectar' },
      { id: 'c', q: 0, r: 0, resource: 'water' },
      { id: 'd', q: 2, r: 0, resource: 'pollen' },
      { id: 'e', q: 3, r: 0, resource: 'nectar' },
    ];
    expect(validateStartingGarden(disconnected).errors)
      .toContain('All five garden tiles must touch in one connected garden.');
    expect(validateStartingGarden([...garden.slice(0, 4), { ...garden[4], q: garden[0].q, r: garden[0].r }]).errors)
      .toContain('Each garden tile must occupy a different space.');
  });

  it('rejects a five-tile straight line in all axial directions', () => {
    const line: GardenTile[] = Array.from({ length: 5 }, (_, index) => ({
      id: `line-${index}`,
      q: index - 2,
      r: 0,
      resource: (['pollen', 'nectar', 'water'] as const)[index % 3],
    }));
    expect(areCollinear(line)).toBe(true);
    expect(validateStartingGarden(line).errors).toContain('The starting garden cannot be one straight line.');
    expect(areCollinear([
      { q: 0, r: 0 },
      { q: 1, r: -1 },
      { q: 2, r: -2 },
    ])).toBe(true);
  });

  it('places four hives only on four separate garden tiles', () => {
    expect(validateHivePlacement(garden, ['a', 'b', 'c', 'd']).valid).toBe(true);
    expect(validateHivePlacement(garden, ['a', 'b', 'c']).valid).toBe(false);
    expect(validateHivePlacement(garden, ['a', 'b', 'c', 'c']).errors)
      .toContain('Each starting hive must be on a different tile.');
    expect(validateHivePlacement(garden, ['a', 'b', 'c', 'missing']).valid).toBe(false);
  });

  it('uses axial distance and accepts only empty adjacent spaces within the board', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: -1 })).toBe(1);
    expect(isGardenPlacementLegal({ q: 0, r: 0 }, [])).toBe(true);
    expect(isGardenPlacementLegal({ q: 2, r: 1 }, garden)).toBe(false);
    expect(isGardenPlacementLegal({ q: 1, r: 0 }, garden)).toBe(false);
    expect(isGardenPlacementLegal({ q: 4, r: 0 }, garden)).toBe(false);
  });
});
