import type { EnvironmentalEvent, GameSnapshot, HexCoord } from '../../game/types';

export type DiceEffectType = 'extremeWeather' | 'varroaMite' | 'climateChange' | 'pesticides' | 'improvement';
export interface DiceEffect {
  id: number;
  type: DiceEffectType;
  startedAt: number;
  duration: number;
  targets: HexCoord[];
  positive: boolean;
}
export const EFFECT_DURATIONS: Record<DiceEffectType, number> = { extremeWeather: 4200, varroaMite: 4200, climateChange: 4400, pesticides: 5000, improvement: 4000 };
export const EFFECT_LABELS: Record<DiceEffectType, string> = { extremeWeather: 'Extreme Weather', varroaMite: 'Varroa Mite', climateChange: 'Climate Change', pesticides: 'Pesticides', improvement: 'Improvement' };
export function effectForEvent(event: EnvironmentalEvent): DiceEffectType {
  return ({ varroa: 'varroaMite', climate: 'climateChange', pesticides: 'pesticides', movementRestriction: 'extremeWeather', extremeWeatherDamage: 'extremeWeather', garden: 'improvement' } as const)[event];
}
export function affectedCoordinates(before: GameSnapshot, after: GameSnapshot): HexCoord[] {
  const changed = new Set<string>();
  for (const tile of before.tiles) {
    const next = after.tiles.find(t => t.id === tile.id);
    if (!next || next.damaged !== tile.damaged) changed.add(tile.id);
  }
  for (const hive of before.hives) {
    const next = after.hives.find(h => h.id === hive.id);
    if (!next || next.damaged !== hive.damaged) changed.add(hive.tileId);
  }
  return before.tiles.filter(tile => changed.has(tile.id)).map(({ q, r }) => ({ q, r }));
}
