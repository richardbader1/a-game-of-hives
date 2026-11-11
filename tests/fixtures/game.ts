import { createInitialGame } from '../../src/game/engine/initialState';
import { setupTransition, type SetupCommand } from '../../src/game/engine/setupEngine';

export const garden = [
  { q: 0, r: 0, resource: 'pollen' }, { q: 1, r: 0, resource: 'nectar' },
  { q: 2, r: 0, resource: 'water' }, { q: 0, r: 1, resource: 'pollen' },
  { q: 1, r: 1, resource: 'nectar' },
] as const;

export function readyGame() {
  const commands: SetupCommand[] = [
    { type: 'players', names: ['Ari', 'Sam'] }, { type: 'starter', index: 1 }, { type: 'garden' },
    ...garden.map(tile => ({ type: 'tile' as const, ...tile })), { type: 'hives' },
    ...garden.slice(0, 4).map(t => ({ type: 'hive' as const, tileId: `tile-${t.q}-${t.r}` })),
    { type: 'character', character: 'bee', tileId: 'tile-0-0' },
    { type: 'character', character: 'beekeeper', tileId: 'tile-0-0' }, { type: 'complete' },
  ];
  return commands.reduce(setupTransition, createInitialGame());
}

export function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
}
