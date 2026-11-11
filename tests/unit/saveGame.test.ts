import { describe, expect, it } from 'vitest';
import { readyGame } from '../fixtures/game';
import { decodeSave, encodeSave, isPlayableSnapshot, SAVE_VERSION } from '../../src/game/persistence/saveGame';
import { beginHivePurchase, moveBeekeeper, rollAndResolveEvent, selectAction, skipAction } from '../../src/game/engine/gameEngine';

describe('versioned saves', () => {
  it('round-trips a started game and omits store functions', () => {
    const state = { ...readyGame(), reset: () => {} };
    const raw = encodeSave(state);
    expect(raw).not.toContain('reset');
    expect(decodeSave(raw).snapshot).toEqual(readyGame());
  });
  it('preserves a resolved event and committed beekeeper destination', () => {
    let state = rollAndResolveEvent(readyGame(), () => 0.4);
    state = moveBeekeeper(selectAction(state, 'beekeeper'), 'tile-1-0');
    const restored = decodeSave(encodeSave(state)).snapshot!;
    expect(restored).toEqual(state);
    expect(moveBeekeeper(restored, 'tile-2-0').beekeeperTileId).toBe('tile-1-0');
    expect(rollAndResolveEvent(restored, () => 0)).toBe(restored);
  });
  it('preserves a pending hive purchase without spending products', () => {
    let state = rollAndResolveEvent(readyGame(), () => 0.4);
    state = skipAction(selectAction(state, 'bee'));
    state = skipAction(selectAction(state, 'beekeeper'));
    state = beginHivePurchase({ ...state, inventory: { ...state.inventory, honey: 2, beeBread: 3 } });
    expect(state.pendingHivePurchase).toBe(true);
    expect(decodeSave(encodeSave(state)).snapshot).toEqual(state);
  });
  it.each(['{', '{}', JSON.stringify({ version: 0, snapshot: readyGame() }), JSON.stringify({ version: 999 })])('handles invalid or older saves: %s', raw => {
    const result = decodeSave(raw);
    expect(result.snapshot).toBeNull();
    expect(result.notice).toBeTruthy();
  });
  it('treats no save as a normal first visit', () => expect(decodeSave(null)).toEqual({ snapshot: null, notice: null }));
  it('rejects invalid inventory, dangling tokens, duplicate coordinates and inconsistent turns', () => {
    const state = readyGame();
    const invalid = [
      { ...state, inventory: { ...state.inventory, water: -1 } },
      { ...state, inventory: { ...state.inventory, honey: 1.5 } },
      { ...state, beeTileId: null }, { ...state, beekeeperTileId: 'missing' },
      { ...state, tiles: [...state.tiles, state.tiles[0]] },
      { ...state, hives: state.hives.map(h => ({ ...h, tileId: 'missing' })) },
      { ...state, currentPlayerIndex: 9 }, { ...state, turnPhase: 'ended' },
      { ...state, pendingHivePurchase: true }, { ...state, actionCategoriesUsed: ['bee', 'bee'] },
      { ...state, turnPhase: 'actions', dieResult: 2, currentEvent: 'pesticides' },
      { ...state, hives: state.hives.map(h => ({ ...h, damaged: true })) },
    ];
    for (const snapshot of invalid) {
      expect(isPlayableSnapshot(snapshot)).toBe(false);
      expect(decodeSave(JSON.stringify({ version: SAVE_VERSION, snapshot })).snapshot).toBeNull();
    }
  });
  it('allows a split garden and a bee sheltering on a damaged tile', () => {
    const state = readyGame();
    state.tiles = state.tiles.filter(t => t.id !== 'tile-1-0' && t.id !== 'tile-1-1');
    state.hives = state.hives.filter(h => state.tiles.some(t => t.id === h.tileId));
    state.tiles[0] = { ...state.tiles[0], damaged: true };
    expect(isPlayableSnapshot(state)).toBe(true);
  });
  it('round-trips an immediate hive defeat', () => {
    let state = readyGame();
    state.hives = state.hives.map((h, i) => ({ ...h, damaged: i > 0 }));
    state = rollAndResolveEvent(state, () => 0);
    expect(state.outcome).toBe('lost');
    expect(decodeSave(encodeSave(state)).snapshot).toEqual(state);
  });
  it('round-trips defeat after the last tile is destroyed', () => {
    let state = readyGame();
    state.tiles = [{ ...state.tiles[0], damaged: true }];
    state.hives = [state.hives[0]];
    let calls = 0;
    state = rollAndResolveEvent(state, () => calls++ === 0 ? 1 / 6 : 0);
    expect(state.outcome).toBe('lost');
    expect(state.beeTileId).toBeNull();
    expect(state.beekeeperTileId).toBeNull();
    expect(decodeSave(encodeSave(state)).snapshot).toEqual(state);
  });
});
