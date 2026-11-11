import type { ResourceType } from '../types';

export const STARTING_TILE_COUNT = 5;
export const STARTING_HIVE_COUNT = 4;
export const TILE_SUPPLY: Record<ResourceType, number> = {
  pollen: 6,
  nectar: 6,
  water: 6,
};
export const IMPROVEMENT_SUPPLY = {
  smartHive: 3,
  wildlifeReserve: 3,
  noSprayZone: 3,
} as const;
export const HIVE_SUPPLY = 15;
export const WINNING_SCORE = 10;

export const RESOURCE_PRESENTATION: Record<
  ResourceType,
  { label: string; icon: string; color: string; softColor: string }
> = {
  pollen: { label: 'Pollen', icon: '✿', color: '#d95855', softColor: '#fbe8e2' },
  nectar: { label: 'Nectar', icon: '✦', color: '#e5a92f', softColor: '#fff2d6' },
  water: { label: 'Water', icon: '≈', color: '#4d91c9', softColor: '#e4f2fb' },
};
