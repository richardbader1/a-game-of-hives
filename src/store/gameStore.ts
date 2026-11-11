import { create } from 'zustand';
import {
  beginHivePurchase,
  cancelHivePurchase,
  completeGardenPlacement,
  completeHivePurchase,
  finishTurn,
  moveBee,
  moveBeekeeper,
  performBeekeeperAction,
  rollAndResolveEvent,
  selectAction,
  selectResource as selectGameResource,
  skipAction,
  tradeProduct,
} from '../game/engine/gameEngine';
import { setupTransition } from '../game/engine/setupEngine';
import { createInitialGame } from '../game/engine/initialState';
import type {
  ActionCategory,
  CharacterType,
  GameSnapshot,
  HexCoord,
  ImprovementType,
  ResourceType,
} from '../game/types';

interface GameActions {
  setPlayers: (names: string[]) => void;
  setStartingPlayer: (index: number) => void;
  beginGardenSetup: () => void;
  selectResource: (resource: ResourceType) => void;
  placeGardenTile: (q: number, r: number) => void;
  removeLastGardenTile: () => void;
  beginHiveSetup: () => void;
  placeHive: (tileId: string) => void;
  beginCharacterSetup: () => void;
  selectCharacter: (character: CharacterType) => void;
  placeCharacter: (character: CharacterType, tileId: string) => void;
  completeSetup: () => void;
  rollDice: (rng?: () => number) => void;
  chooseAction: (category: ActionCategory) => void;
  handleBoardTile: (tileId: string | null, coord: HexCoord) => void;
  beekeeperAction: (action: 'repairHive' | 'repairTile' | ImprovementType) => void;
  skipCurrentAction: () => void;
  trade: (product: 'honey' | 'beeBread') => void;
  beginHivePurchase: () => void;
  cancelHivePurchase: () => void;
  finishTurn: () => void;
  reset: () => void;
}

type GameState = GameSnapshot & GameActions;

export const useGameStore = create<GameState>((set, get) => ({
  ...createInitialGame(),
  setPlayers: (names) => set(state => setupTransition(state, { type: 'players', names })),
  setStartingPlayer: (index) => set(state => setupTransition(state, { type: 'starter', index })),
  beginGardenSetup: () => set(state => setupTransition(state, { type: 'garden' })),
  selectResource: (resource) => set(state => selectGameResource(state, resource)),
  placeGardenTile: (q, r) => set(state => setupTransition(state, { type: 'tile', q, r, resource: state.selectedResource })),
  removeLastGardenTile: () => set(state => setupTransition(state, { type: 'undoTile' })),
  beginHiveSetup: () => set(state => setupTransition(state, { type: 'hives' })),
  placeHive: (tileId) => set(state => setupTransition(state, { type: 'hive', tileId })),
  beginCharacterSetup: () => set(state => setupTransition(state, { type: 'characters' })),
  selectCharacter: (character) => set(state => setupTransition(state, { type: 'selectCharacter', character })),
  placeCharacter: (character, tileId) => set(state => setupTransition(state, { type: 'character', character, tileId })),
  completeSetup: () => set(state => setupTransition(state, { type: 'complete' })),
  rollDice: (rng = Math.random) => set((state) => rollAndResolveEvent(state, rng)),
  chooseAction: (category) => set((state) => selectAction(state, category)),
  handleBoardTile: (tileId, coord) => {
    const state = get();
    if (state.phase !== 'ready' || state.outcome) return;
    if (state.turnPhase === 'eventPlacement') {
      set((current) => completeGardenPlacement(current, coord, current.selectedResource, true));
      return;
    }
    if (state.turnPhase === 'actions') {
      if (state.selectedAction === 'bee' && tileId) {
        set((current) => moveBee(current, tileId));
      } else if (state.selectedAction === 'beekeeper' && tileId) {
        set((current) => moveBeekeeper(current, tileId));
      } else if (state.selectedAction === 'garden' && !tileId) {
        set((current) => completeGardenPlacement(current, coord, current.selectedResource));
      } else if (tileId) {
        set({ selectedTileId: tileId, error: null });
      }
      return;
    }
    if (state.turnPhase === 'trading' && state.pendingHivePurchase && tileId) {
      set((current) => completeHivePurchase(current, tileId));
      return;
    }
    if (tileId) set({ selectedTileId: tileId, error: null });
  },
  beekeeperAction: (action) => set((state) => performBeekeeperAction(state, action)),
  skipCurrentAction: () => set((state) => skipAction(state)),
  trade: (product) => set((state) => tradeProduct(state, product)),
  beginHivePurchase: () => set((state) => beginHivePurchase(state)),
  cancelHivePurchase: () => set((state) => cancelHivePurchase(state)),
  finishTurn: () => set((state) => finishTurn(state)),
  reset: () => set(createInitialGame()),
}));
