import type { EnvironmentalEvent } from '../types';

// Confirmed by the designer on 13 November 2026 to match the supplied GLB.
export const DIE_EVENTS: readonly EnvironmentalEvent[] = [
  'varroa', 'climate', 'pesticides', 'movementRestriction', 'garden', 'garden',
];
export const ROLL_DURATION_MS = 3600;
export const DICE_TRAVEL_DURATION_MS = 2600; // Hold the clearly labelled landed face for one second.
export const REDUCED_ROLL_DURATION_MS = 800;
export const EVENT_NOTICE_MS = 3100; // 250ms fade in, 2500ms hold, 350ms fade out.

