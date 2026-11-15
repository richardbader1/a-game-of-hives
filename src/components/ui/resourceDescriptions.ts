import type { ResourceType } from '../../game/types';

export const RESOURCE_DESCRIPTIONS: Record<ResourceType, string> = {
  pollen: 'Bees use pollen as a source of protein to help young bees grow.',
  nectar: 'Bees collect nectar for energy and turn it into honey.',
  water: 'Bees use water to cool their hive and help feed developing bees.',
};
export const GARDEN_GUIDE_IDS = ['garden', 'garden-pollen', 'garden-nectar', 'garden-water', 'garden-place'] as const;
export function gardenGuideIndex(reviewed: readonly string[]) {
  const index = GARDEN_GUIDE_IDS.findIndex(id => !reviewed.includes(id));
  return index < 0 ? 4 : index;
}
export function gardenResourceFocus(tour: { active: boolean; reviewed: string[]; reviewIndex: number | null; history: Array<{ id: string }> }): ResourceType | undefined {
  if (!tour.active || tour.reviewed.includes('garden-place')) return;
  const id = tour.reviewIndex === null ? GARDEN_GUIDE_IDS[gardenGuideIndex(tour.reviewed)] : tour.history[tour.reviewIndex]?.id;
  return id === 'garden-pollen' ? 'pollen' : id === 'garden-nectar' ? 'nectar' : id === 'garden-water' ? 'water' : undefined;
}
