import { create } from 'zustand';
import { STARTING_HIVE_COUNT, STARTING_TILE_COUNT, TILE_SUPPLY } from '../game/config/gameSettings';
import { isGardenPlacementLegal } from '../game/board/legalPlacement';
import {
  INITIAL_INVENTORY,
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
import { validateHivePlacement, validatePlayers, validateStartingGarden } from '../game/engine/setupValidator';
import type {
  ActionCategory,
  CharacterType,
  GameSnapshot,
  GardenTile,
  HexCoord,
  Hive,
  ImprovementType,
  Player,
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

const initialState: GameSnapshot = {
  phase: 'playerSetup',
  players: [],
  startingPlayerIndex: 0,
  tiles: [],
  hives: [],
  beeTileId: null,
  beekeeperTileId: null,
  activeCharacter: 'bee',
  selectedResource: 'pollen',
  message: 'First, add your team of 2–4 players.',
  error: null,
  turnPhase: 'roll',
  currentPlayerIndex: 0,
  roundNumber: 1,
  actionCategoriesUsed: [],
  selectedAction: null,
  selectedTileId: null,
  inventory: { ...INITIAL_INVENTORY },
  dieResult: null,
  currentEvent: null,
  eventRestriction: null,
  pendingHivePurchase: false,
  outcome: null,
  eventLog: [],
  lastCollected: null,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,
  setPlayers: (names) => {
    const players = names.map((name, index) => ({ id: `player-${index + 1}`, name: name.trim() }));
    set({
      players,
      startingPlayerIndex: Math.min(get().startingPlayerIndex, Math.max(players.length - 1, 0)),
      error: null,
    });
  },
  setStartingPlayer: (index) => {
    if (index >= 0 && index < get().players.length) set({ startingPlayerIndex: index });
  },
  beginGardenSetup: () => {
    const validation = validatePlayers(get().players);
    if (!validation.valid) {
      set({ error: validation.errors[0] ?? 'Check the player names.' });
      return;
    }
    set({
      phase: 'gardenSetup',
      tiles: [],
      message: 'Choose a tile type, then tap a highlighted space to grow your connected garden.',
      error: null,
    });
  },
  selectResource: (resource) => set((state) => selectGameResource(state, resource)),
  placeGardenTile: (q, r) => {
    const { phase, tiles, selectedResource } = get();
    if (phase !== 'gardenSetup') return;
    if (tiles.length >= STARTING_TILE_COUNT) {
      set({ error: 'Your starting garden has five tiles. Remove the last tile to change it.' });
      return;
    }
    if (!isGardenPlacementLegal({ q, r }, tiles)) {
      set({ error: 'Choose an empty space next to your garden.' });
      return;
    }
    const used = tiles.filter((tile) => tile.resource === selectedResource).length;
    if (used >= TILE_SUPPLY[selectedResource]) {
      set({ error: `There are no ${selectedResource} tiles left in the supply.` });
      return;
    }
    const nextTiles = [...tiles, { id: `tile-${q}-${r}`, q, r, resource: selectedResource }];
    set({ tiles: nextTiles, error: null });
  },
  removeLastGardenTile: () => {
    const { phase, tiles } = get();
    if (phase === 'gardenSetup' && tiles.length > 0) {
      set({ tiles: tiles.slice(0, -1), error: null });
    }
  },
  beginHiveSetup: () => {
    const validation = validateStartingGarden(get().tiles);
    if (!validation.valid) {
      set({ error: validation.errors[0] ?? 'Check your starting garden.' });
      return;
    }
    set({
      phase: 'hiveSetup',
      hives: [],
      message: 'Place four hives on four different garden tiles.',
      error: null,
    });
  },
  placeHive: (tileId) => {
    const { phase, tiles, hives } = get();
    if (phase !== 'hiveSetup') return;
    if (!tiles.some((tile) => tile.id === tileId)) {
      set({ error: 'Choose a garden tile for the hive.' });
      return;
    }
    if (hives.some((hive) => hive.tileId === tileId)) {
      set({ error: 'Each starting hive needs its own tile.' });
      return;
    }
    const nextHives: Hive[] = [
      ...hives,
      { id: `hive-${tileId}`, tileId, damaged: false, smartHive: false },
    ];
    set({ hives: nextHives, error: null });
    if (nextHives.length === STARTING_HIVE_COUNT) get().beginCharacterSetup();
  },
  beginCharacterSetup: () => {
    const validation = validateHivePlacement(get().tiles, get().hives.map((hive) => hive.tileId));
    if (!validation.valid) {
      set({ error: validation.errors[0] ?? 'Place all four hives first.' });
      return;
    }
    set({
      phase: 'characterSetup',
      beeTileId: null,
      beekeeperTileId: null,
      activeCharacter: 'bee',
      error: null,
    });
  },
  selectCharacter: (activeCharacter) => set({ activeCharacter, error: null }),
  placeCharacter: (character, tileId) => {
    const { phase, tiles } = get();
    if (phase !== 'characterSetup' || !tiles.some((tile) => tile.id === tileId)) return;
    if (character === 'bee') {
      set({ beeTileId: tileId, activeCharacter: 'beekeeper', error: null });
    } else {
      set({ beekeeperTileId: tileId, error: null });
    }
  },
  completeSetup: () => {
    const state = get();
    if (state.phase !== 'characterSetup' || !state.beeTileId || !state.beekeeperTileId) {
      set({ error: 'Place both the bee and beekeeper before starting.' });
      return;
    }
    set({
      phase: 'ready',
      turnPhase: 'roll',
      currentPlayerIndex: state.startingPlayerIndex,
      roundNumber: 1,
      message: 'Your garden is ready! Roll the dice to begin the first turn.',
      error: null,
    });
  },
  rollDice: (rng = Math.random) => set((state) => rollAndResolveEvent(state, rng)),
  chooseAction: (category) => set((state) => selectAction(state, category)),
  handleBoardTile: (tileId, coord) => {
    const state = get();
    if (state.phase !== 'ready') return;
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
  reset: () => set(initialState),
}));
