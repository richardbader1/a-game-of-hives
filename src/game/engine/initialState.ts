import type { GameSnapshot } from '../types';
import { INITIAL_INVENTORY } from './gameEngine';

export function createInitialGame(): GameSnapshot {
  return {
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
}
