import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { garden, memoryStorage, readyGame } from '../fixtures/game';
import { useGameStore } from '../../src/store/gameStore';
import { initializePersistence, resumeSavedGame, useSessionStore } from '../../src/store/sessionStore';
import { decodeSave, encodeSave, SAVE_KEY } from '../../src/game/persistence/saveGame';
import { legalGardenPositions, scoreInventory } from '../../src/game/engine/gameEngine';
import { placementCoordinates } from '../../src/game/selectors';

let stop: (() => void) | undefined;
beforeEach(() => {
  useGameStore.getState().reset();
  useSessionStore.setState({ savedGame: null, notice: null });
});
afterEach(() => { stop?.(); stop = undefined; });

describe('store, engine and persistence integration', () => {
  it('plays from manual setup through a victory, validating every autosave', () => {
    const storage = memoryStorage();
    stop = initializePersistence(storage);
    const game = () => useGameStore.getState();
    game().setPlayers(['Ari', 'Sam']); game().setStartingPlayer(1); game().beginGardenSetup();
    for (const t of garden) { game().selectResource(t.resource); game().placeGardenTile(t.q, t.r); }
    game().beginHiveSetup();
    for (const t of garden.slice(0, 4)) game().placeHive(`tile-${t.q}-${t.r}`);
    expect(game().phase).toBe('characterSetup');
    game().placeCharacter('bee', 'tile-0-0'); game().placeCharacter('beekeeper', 'tile-0-0'); game().completeSetup();
    expect(game().phase).toBe('ready');
    let invalidSaves = 0;
    const unsubscribe = useGameStore.subscribe(() => {
      if (!decodeSave(storage.getItem(SAVE_KEY)).snapshot) invalidSaves++;
    });
    try {
      for (let turn = 0; turn < 15; turn++) {
        game().rollDice(() => 0.99);
        if (game().turnPhase === 'eventPlacement') {
          const resource = (['pollen', 'nectar', 'water'] as const).find(r => game().tiles.filter(t => t.resource === r).length < 6)!;
          game().selectResource(resource);
          game().handleBoardTile(null, placementCoordinates(game())[0]);
        }
        game().chooseAction('bee');
        const destination = ['tile-1-0', 'tile-2-0', 'tile-0-0'][turn % 3];
        const tile = game().tiles.find(t => t.id === destination)!;
        game().handleBoardTile(tile.id, tile);
        game().chooseAction('beekeeper'); game().skipCurrentAction();
        expect(game().turnPhase).toBe('trading');
        while (game().inventory.pollen && game().inventory.nectar && game().inventory.water) game().trade('honey');
        game().finishTurn();
      }
    } finally { unsubscribe(); }
    expect(invalidSaves).toBe(0);
    expect(scoreInventory(game().inventory)).toBe(10);
    expect(game().outcome).toBe('won');
    expect(decodeSave(storage.getItem(SAVE_KEY)).snapshot?.outcome).toBe('won');
    const won = game(); game().rollDice(() => 0); game().beginGardenSetup();
    expect(game()).toBe(won);
    game().reset();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('offers a save without automatically resuming and restores commands after resume', () => {
    const storage = memoryStorage(); storage.setItem(SAVE_KEY, encodeSave(readyGame()));
    stop = initializePersistence(storage);
    expect(useGameStore.getState().phase).toBe('playerSetup');
    expect(useSessionStore.getState().savedGame?.currentPlayerIndex).toBe(1);
    resumeSavedGame();
    useGameStore.getState().rollDice(() => 0.99);
    const coord = legalGardenPositions(useGameStore.getState().tiles)[0];
    useGameStore.getState().handleBoardTile(null, coord);
    expect(useGameStore.getState().turnPhase).toBe('actions');
    expect(decodeSave(storage.getItem(SAVE_KEY)).snapshot?.tiles.length).toBe(6);
  });

  it('keeps play working when storage reads or writes are blocked', () => {
    const storage = memoryStorage();
    stop = initializePersistence({ ...storage, getItem: () => { throw new Error('blocked'); } });
    expect(useSessionStore.getState().notice).toContain('Saving is unavailable');
    stop();
    stop = initializePersistence({ ...storage, setItem: () => { throw new Error('quota'); } });
    useGameStore.setState(readyGame());
    expect(useSessionStore.getState().notice).toContain('could not be saved');
    useGameStore.getState().rollDice(() => 0.4);
    expect(useGameStore.getState().turnPhase).toBe('actions');
  });
});
