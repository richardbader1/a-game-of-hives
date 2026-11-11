import { describe, expect, it } from 'vitest';
import { readyGame } from '../fixtures/game';
import { finishTurn, moveBee, moveBeekeeper, performBeekeeperAction, rollAndResolveEvent, selectAction, skipAction, tradeProduct, completeGardenPlacement, beginHivePurchase, completeHivePurchase } from '../../src/game/engine/gameEngine';
import { setupTransition } from '../../src/game/engine/setupEngine';
import { createInitialGame } from '../../src/game/engine/initialState';
import { CAMERA_FRAME, CAMERA_OFFSET, fitBoard } from '../../src/components/scene/boardFraming';
import { OrthographicCamera, Vector3 } from 'three';
import type { GameSnapshot } from '../../src/game/types';

describe('readiness regressions', () => {
  it.each([0, 1, 2, 3])('counts full rounds relative to starting player %i', starter => {
    const players = ['A', 'B', 'C', 'D'].map(name => ({ id: name, name }));
    let state = { ...readyGame(), players, startingPlayerIndex: starter, currentPlayerIndex: starter };
    for (let turn = 1; turn <= 8; turn++) {
      state = finishTurn({ ...state, turnPhase: 'trading' });
      expect(state.roundNumber).toBe(1 + Math.floor(turn / players.length));
      expect(state.currentPlayerIndex).toBe((starter + turn) % players.length);
    }
  });

  it('shelters an evacuated bee and restores movement after repair without free collection', () => {
    let state = readyGame();
    state = { ...state, tiles: state.tiles.map(t => ({ ...t, damaged: true })), inventory: { ...state.inventory, pollen: 1 } };
    let calls = 0;
    state = rollAndResolveEvent(state, () => calls++ === 0 ? 1 / 6 : 0);
    expect(state.outcome).toBeNull();
    expect(state.beeTileId).toBe('tile-0-1'); // nearest tie broken by (q,r)
    expect(state.inventory.pollen).toBe(0);
    state = selectAction(state, 'beekeeper');
    state = moveBeekeeper(state, 'tile-1-0');
    state = performBeekeeperAction(state, 'repairTile');
    state = selectAction(state, 'bee');
    state = moveBee(state, 'tile-1-0');
    expect(state.beeTileId).toBe('tile-1-0');
    expect(state.inventory.nectar).toBe(2);
    expect(state.turnPhase).toBe('trading');
  });

  it('rejects stale gameplay commands in setup and after an outcome', () => {
    const commands = [
      (s: GameSnapshot) => selectAction(s, 'bee'), (s: GameSnapshot) => moveBee(s, 'tile-1-0'),
      (s: GameSnapshot) => moveBeekeeper(s, 'tile-1-0'), (s: GameSnapshot) => performBeekeeperAction(s, 'repairTile'),
      skipAction, (s: GameSnapshot) => tradeProduct(s, 'honey'), beginHivePurchase,
      (s: GameSnapshot) => completeHivePurchase(s, 'tile-1-1'), finishTurn,
      (s: GameSnapshot) => completeGardenPlacement(s, { q: -1, r: 0 }, 'pollen'),
    ];
    for (const phase of ['actions', 'trading', 'eventPlacement'] as const) for (const command of commands) {
      const terminal = { ...readyGame(), turnPhase: phase, outcome: 'lost' as const, selectedAction: 'bee' as const };
      expect(command(terminal)).toBe(terminal);
      const setup = { ...terminal, phase: 'gardenSetup' as const, outcome: null };
      expect(command(setup)).toBe(setup);
    }
  });

  it('guards setup order and cannot restart setup during a live game', () => {
    const initial = createInitialGame();
    expect(setupTransition(initial, { type: 'hives' })).toBe(initial);
    const state = readyGame();
    expect(state.phase).toBe('ready');
    for (const command of [{ type: 'garden' }, { type: 'hives' }, { type: 'characters' }, { type: 'players', names: ['X', 'Y'] }] as const) {
      expect(setupTransition(state, command)).toBe(state);
    }
  });

  it('fits an elongated eighteen-tile garden without a minimum-zoom cutoff', () => {
    const coords = Array.from({ length: 18 }, (_, q) => ({ q, r: 0 }));
    const large = fitBoard(coords, 1200, 800, { left: 12, top: 100, width: 800, height: 400 });
    const small = fitBoard(coords, 390, 700, { left: 10, top: 250, width: 370, height: 150 });
    expect(small.zoom).toBeGreaterThan(0);
    expect(small.zoom).toBeLessThan(0.7);
    expect(large.zoom).toBeGreaterThan(small.zoom);
    expect(Number.isFinite(small.x) && Number.isFinite(small.z)).toBe(true);
  });

  it.each([{ width: 1280, height: 664, area: { left: 12, top: 80, width: 930, height: 550 } },
    { width: 820, height: 1124, area: { left: 12, top: 480, width: 796, height: 632 } }])(
    'keeps every long-garden tile inside the usable viewport and depth planes ($width px)', ({ width, height, area }) => {
      const coords = Array.from({ length: 18 }, (_, q) => ({ q, r: 0 }));
      const fit = fitBoard(coords, width, height, area);
      const camera = new OrthographicCamera(-CAMERA_FRAME * width / height, CAMERA_FRAME * width / height, CAMERA_FRAME, -CAMERA_FRAME, 0.1, 500);
      camera.position.set(fit.x + CAMERA_OFFSET.x, CAMERA_OFFSET.y, fit.z + CAMERA_OFFSET.z);
      camera.lookAt(fit.x, 0, fit.z); camera.zoom = fit.zoom;
      camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      for (const coord of coords) for (const dx of [-1, 1]) for (const dz of [-1, 1]) for (const y of [-0.5, 1.5]) {
        const point = new Vector3(Math.sqrt(3) * coord.q + dx, y, dz).project(camera);
        const screenX = (point.x + 1) * width / 2, screenY = (1 - point.y) * height / 2;
        expect(screenX).toBeGreaterThanOrEqual(area.left);
        expect(screenX).toBeLessThanOrEqual(area.left + area.width);
        expect(screenY).toBeGreaterThanOrEqual(area.top);
        expect(screenY).toBeLessThanOrEqual(area.top + area.height);
        expect(point.z).toBeGreaterThan(-1); expect(point.z).toBeLessThan(1);
      }
    },
  );
});
