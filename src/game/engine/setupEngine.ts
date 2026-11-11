import type { CharacterType, GameSnapshot, ResourceType } from '../types';
import { STARTING_HIVE_COUNT, STARTING_TILE_COUNT, TILE_SUPPLY } from '../config/gameSettings';
import { isGardenPlacementLegal } from '../board/legalPlacement';
import { validateHivePlacement, validatePlayers, validateStartingGarden } from './setupValidator';

export type SetupCommand =
  | { type: 'players'; names: readonly string[] }
  | { type: 'starter'; index: number }
  | { type: 'garden' }
  | { type: 'tile'; q: number; r: number; resource: ResourceType }
  | { type: 'undoTile' }
  | { type: 'hives' }
  | { type: 'hive'; tileId: string }
  | { type: 'characters' }
  | { type: 'selectCharacter'; character: CharacterType }
  | { type: 'character'; character: CharacterType; tileId: string }
  | { type: 'complete' };

/** Setup uses the same pure snapshot -> snapshot contract as gameplay. */
export function setupTransition(state: GameSnapshot, command: SetupCommand): GameSnapshot {
  if (state.phase === 'ready' || state.outcome) return state;
  switch (command.type) {
    case 'players': {
      if (state.phase !== 'playerSetup') return state;
      const players = command.names.map((name, i) => ({ id: `player-${i + 1}`, name: name.trim() }));
      return { ...state, players, startingPlayerIndex: Math.min(state.startingPlayerIndex, Math.max(0, players.length - 1)), error: null };
    }
    case 'starter':
      return state.phase === 'playerSetup' && Number.isInteger(command.index) && command.index >= 0 && command.index < state.players.length
        ? { ...state, startingPlayerIndex: command.index } : state;
    case 'garden': {
      if (state.phase !== 'playerSetup') return state;
      const validation = validatePlayers(state.players);
      return validation.valid
        ? { ...state, phase: 'gardenSetup', tiles: [], message: 'Choose a tile type, then tap a highlighted space to grow your connected garden.', error: null }
        : { ...state, error: validation.errors[0] };
    }
    case 'tile': {
      if (state.phase !== 'gardenSetup') return state;
      if (state.tiles.length >= STARTING_TILE_COUNT) return { ...state, error: 'Your starting garden has five tiles. Remove the last tile to change it.' };
      if (!isGardenPlacementLegal(command, state.tiles)) return { ...state, error: 'Choose an empty space next to your garden.' };
      if (state.tiles.filter(t => t.resource === command.resource).length >= TILE_SUPPLY[command.resource]) {
        return { ...state, error: `There are no ${command.resource} tiles left in the supply.` };
      }
      return { ...state, tiles: [...state.tiles, { id: `tile-${command.q}-${command.r}`, q: command.q, r: command.r, resource: command.resource }], error: null };
    }
    case 'undoTile':
      return state.phase === 'gardenSetup' ? { ...state, tiles: state.tiles.slice(0, -1), error: null } : state;
    case 'hives': {
      if (state.phase !== 'gardenSetup') return state;
      const validation = validateStartingGarden(state.tiles);
      return validation.valid
        ? { ...state, phase: 'hiveSetup', hives: [], message: 'Place four hives on four different garden tiles.', error: null }
        : { ...state, error: validation.errors[0] };
    }
    case 'hive': {
      if (state.phase !== 'hiveSetup' || state.hives.length >= STARTING_HIVE_COUNT) return state;
      if (!state.tiles.some(t => t.id === command.tileId && !t.damaged)) return { ...state, error: 'Choose a healthy garden tile for the hive.' };
      if (state.hives.some(h => h.tileId === command.tileId)) return { ...state, error: 'Each starting hive needs its own tile.' };
      const next = { ...state, hives: [...state.hives, { id: `hive-${command.tileId}`, tileId: command.tileId, damaged: false, smartHive: false }], error: null };
      return next.hives.length === STARTING_HIVE_COUNT ? setupTransition(next, { type: 'characters' }) : next;
    }
    case 'characters': {
      if (state.phase !== 'hiveSetup') return state;
      const validation = validateHivePlacement(state.tiles, state.hives.map(h => h.tileId));
      return validation.valid
        ? { ...state, phase: 'characterSetup', beeTileId: null, beekeeperTileId: null, activeCharacter: 'bee', error: null }
        : { ...state, error: validation.errors[0] };
    }
    case 'selectCharacter':
      return state.phase === 'characterSetup' ? { ...state, activeCharacter: command.character, error: null } : state;
    case 'character':
      if (state.phase !== 'characterSetup' || !state.tiles.some(t => t.id === command.tileId)) return state;
      return command.character === 'bee'
        ? { ...state, beeTileId: command.tileId, activeCharacter: 'beekeeper', error: null }
        : { ...state, beekeeperTileId: command.tileId, error: null };
    case 'complete': {
      if (state.phase !== 'characterSetup') return state;
      const errors = [
        ...validatePlayers(state.players).errors,
        ...validateStartingGarden(state.tiles).errors,
        ...validateHivePlacement(state.tiles, state.hives.map(h => h.tileId)).errors,
      ];
      if (!state.tiles.some(t => t.id === state.beeTileId) || !state.tiles.some(t => t.id === state.beekeeperTileId)) {
        errors.push('Place both the bee and beekeeper before starting.');
      }
      if (errors.length) return { ...state, error: errors[0] };
      return { ...state, phase: 'ready', turnPhase: 'roll', currentPlayerIndex: state.startingPlayerIndex,
        roundNumber: 1, message: 'Your garden is ready! Roll the die to begin the first turn.', error: null };
    }
  }
}
