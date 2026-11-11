import type { GameSnapshot, HexCoord } from './types';
import { legalGardenPositions, legalHivePurchaseTiles, movementDestinations, remainingTileSupply } from './engine/gameEngine';
import { RESOURCE_PRESENTATION } from './config/gameSettings';

export type BoardState = Pick<GameSnapshot, 'phase' | 'outcome' | 'turnPhase' | 'selectedAction' | 'selectedTileId' | 'beeTileId' | 'beekeeperTileId' | 'tiles' | 'hives' | 'eventRestriction' | 'pendingHivePurchase' | 'selectedResource'>;

export function selectableTileIds(state: BoardState): string[] {
  if (state.phase !== 'ready' || state.outcome) return [];
  if (state.turnPhase === 'actions') {
    if (state.selectedAction === 'bee' && state.eventRestriction !== 'noBeeMove') {
      return movementDestinations(state.beeTileId, state.tiles, 'bee');
    }
    if (state.selectedAction === 'beekeeper' && !state.selectedTileId) {
      return movementDestinations(state.beekeeperTileId, state.tiles, 'beekeeper');
    }
  }
  return state.turnPhase === 'trading' && state.pendingHivePurchase ? legalHivePurchaseTiles(state) : [];
}

export function placementCoordinates(state: BoardState): HexCoord[] {
  return state.phase === 'ready' && !state.outcome &&
    (state.turnPhase === 'eventPlacement' || (state.turnPhase === 'actions' && state.selectedAction === 'garden')) &&
    remainingTileSupply(state.tiles, state.selectedResource) > 0 ? legalGardenPositions(state.tiles) : [];
}

export function tileDescription(state: GameSnapshot, tileId: string): string {
  const tile = state.tiles.find(t => t.id === tileId);
  if (!tile) return 'Missing tile';
  const hive = state.hives.find(h => h.tileId === tileId);
  return [
    `${RESOURCE_PRESENTATION[tile.resource].label} at ${tile.q}, ${tile.r}`,
    tile.damaged ? 'damaged tile' : 'healthy tile',
    hive ? `${hive.damaged ? 'damaged' : 'healthy'}${hive.smartHive ? ' smart' : ''} hive` : '',
    tile.wildlifeReserve ? 'wildlife reserve' : '', tile.noSprayZone ? 'no-spray zone' : '',
  ].filter(Boolean).join('; ');
}
