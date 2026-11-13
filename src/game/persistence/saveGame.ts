import type { GameSnapshot } from '../types';
import { DIE_EVENTS } from '../config/dice';
import { createInitialGame } from '../engine/initialState';
import { HIVE_SUPPLY, IMPROVEMENT_SUPPLY, TILE_SUPPLY, WINNING_SCORE } from '../config/gameSettings';
import { healthyHiveCount, scoreInventory } from '../engine/gameEngine';

export const SAVE_KEY = 'a-game-of-hives.save';
export const SAVE_VERSION = 1;
const resources = ['pollen', 'nectar', 'water'];
const categories = ['bee', 'beekeeper', 'garden'];
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 1000;
const count = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const optionalBoolean = (v: unknown) => v === undefined || typeof v === 'boolean';

/** Validate both JSON shape and relationships before it reaches the engine. */
export function isPlayableSnapshot(value: unknown): value is GameSnapshot {
  if (!record(value) || value.phase !== 'ready') return false;
  const s = value;
  if (!Array.isArray(s.players) || s.players.length < 2 || s.players.length > 4 ||
    !s.players.every(p => record(p) && text(p.id) && text(p.name) && p.name.trim().length > 0 && p.name.length <= 24)) return false;
  if (new Set(s.players.map(p => p.id)).size !== s.players.length) return false;
  if (!count(s.startingPlayerIndex) || s.startingPlayerIndex >= s.players.length ||
    !count(s.currentPlayerIndex) || s.currentPlayerIndex >= s.players.length || !count(s.roundNumber) || s.roundNumber < 1) return false;
  if (!Array.isArray(s.tiles) || s.tiles.length > Object.values(TILE_SUPPLY).reduce((a, b) => a + b, 0) ||
    !s.tiles.every(t => record(t) && text(t.id) && Number.isSafeInteger(t.q) && Number.isSafeInteger(t.r) &&
      Math.abs(t.q as number) <= 10000 && Math.abs(t.r as number) <= 10000 && resources.includes(t.resource as string) &&
      optionalBoolean(t.damaged) && optionalBoolean(t.wildlifeReserve) && optionalBoolean(t.noSprayZone))) return false;
  const tileIds = new Set(s.tiles.map(t => t.id));
  if (tileIds.size !== s.tiles.length || new Set(s.tiles.map(t => `${t.q},${t.r}`)).size !== s.tiles.length) return false;
  for (const resource of resources as Array<keyof typeof TILE_SUPPLY>) {
    if (s.tiles.filter(t => t.resource === resource).length > TILE_SUPPLY[resource]) return false;
  }
  if (!Array.isArray(s.hives) || s.hives.length > HIVE_SUPPLY || !s.hives.every(h =>
    record(h) && text(h.id) && tileIds.has(h.tileId) && typeof h.damaged === 'boolean' && typeof h.smartHive === 'boolean')) return false;
  if (new Set(s.hives.map(h => h.id)).size !== s.hives.length || new Set(s.hives.map(h => h.tileId)).size !== s.hives.length) return false;
  if (s.hives.filter(h => h.smartHive).length > IMPROVEMENT_SUPPLY.smartHive ||
    s.tiles.filter(t => t.wildlifeReserve).length > IMPROVEMENT_SUPPLY.wildlifeReserve ||
    s.tiles.filter(t => t.noSprayZone).length > IMPROVEMENT_SUPPLY.noSprayZone) return false;
  if (!record(s.inventory) || !['pollen', 'nectar', 'water', 'honey', 'beeBread'].every(k => count((s.inventory as Record<string, unknown>)[k]))) return false;
  if (!['roll', 'eventPlacement', 'actions', 'trading', 'ended'].includes(s.turnPhase as string) ||
    ![null, 'won', 'lost'].includes(s.outcome as null) || typeof s.pendingHivePurchase !== 'boolean') return false;
  if (!['bee', 'beekeeper'].includes(s.activeCharacter as string) || !resources.includes(s.selectedResource as string)) return false;
  if (!Array.isArray(s.actionCategoriesUsed) || s.actionCategoriesUsed.length > 2 ||
    !s.actionCategoriesUsed.every(c => categories.includes(c)) || new Set(s.actionCategoriesUsed).size !== s.actionCategoriesUsed.length) return false;
  if (s.selectedAction !== null && (!categories.includes(s.selectedAction as string) || s.actionCategoriesUsed.includes(s.selectedAction))) return false;
  if (typeof s.message !== 'string' || s.message.length > 2000 || (s.error !== null && !text(s.error))) return false;
  if (!Array.isArray(s.eventLog) || s.eventLog.length > 40 || !s.eventLog.every(text)) return false;
  if (s.lastCollected !== null && (!record(s.lastCollected) || !resources.includes(s.lastCollected.resource as string) ||
    ![1, 2].includes(s.lastCollected.amount as number))) return false;
  if (s.selectedTileId !== null && !tileIds.has(s.selectedTileId)) return false;
  for (const key of ['beeTileId', 'beekeeperTileId']) {
    if (!tileIds.has(s[key]) && !(s.outcome === 'lost' && s.tiles.length === 0 && s[key] === null)) return false;
  }
  if (s.turnPhase === 'roll') {
    if (s.dieResult !== null || s.currentEvent !== null || s.eventRestriction !== null || s.actionCategoriesUsed.length) return false;
  } else {
    if (!count(s.dieResult) || s.dieResult < 1 || s.dieResult > 6) return false;
    // Old saves may contain an already-resolved weather-damage result on face 5.
    // Preserve that result rather than rerolling, undoing damage or rejecting the save.
    if (s.currentEvent !== DIE_EVENTS[s.dieResult - 1] && !(s.dieResult === 5 && s.currentEvent === 'extremeWeatherDamage')) return false;
    const restriction = s.currentEvent === 'pesticides' ? 'waterOnly' : s.currentEvent === 'movementRestriction' ? 'noBeeMove' : null;
    if (s.eventRestriction !== restriction) return false;
  }
  if ((s.turnPhase === 'ended') !== (s.outcome !== null)) return false;
  if (s.selectedAction !== null && s.turnPhase !== 'actions') return false;
  if (s.turnPhase === 'actions' && s.actionCategoriesUsed.length >= 2) return false;
  if (s.turnPhase === 'eventPlacement' && (s.currentEvent !== 'garden' || s.actionCategoriesUsed.length)) return false;
  if (s.turnPhase === 'trading' && s.actionCategoriesUsed.length !== 2) return false;
  if (s.pendingHivePurchase && s.turnPhase !== 'trading') return false;
  if (s.selectedAction === 'beekeeper' && s.selectedTileId !== null && s.selectedTileId !== s.beekeeperTileId) return false;
  const snapshot = s as unknown as GameSnapshot;
  if (s.outcome === 'lost' ? healthyHiveCount(snapshot.hives) !== 0 : healthyHiveCount(snapshot.hives) === 0) return false;
  if (s.outcome === 'won' && scoreInventory(snapshot.inventory) < WINNING_SCORE) return false;
  // Destruction may split the garden; do not reapply starting-layout rules to a running game.
  return true;
}

export function snapshotOnly(state: GameSnapshot): GameSnapshot {
  return Object.fromEntries(Object.keys(createInitialGame()).map(key => [key, state[key as keyof GameSnapshot]])) as unknown as GameSnapshot;
}

export function encodeSave(state: GameSnapshot): string {
  return JSON.stringify({ version: SAVE_VERSION, snapshot: snapshotOnly(state) });
}

export type SaveResult = { snapshot: GameSnapshot | null; notice: string | null };
export function decodeSave(raw: string | null): SaveResult {
  if (raw === null) return { snapshot: null, notice: null };
  try {
    if (raw.length > 200000) throw new Error('Oversized save');
    const data: unknown = JSON.parse(raw);
    if (!record(data) || data.version !== SAVE_VERSION) {
      return { snapshot: null, notice: 'This saved game uses an unsupported version. You can start a new game.' };
    }
    if (!isPlayableSnapshot(data.snapshot)) throw new Error('Invalid save');
    return { snapshot: snapshotOnly(data.snapshot), notice: null };
  } catch {
    return { snapshot: null, notice: 'The saved game could not be read. You can start a new game.' };
  }
}
