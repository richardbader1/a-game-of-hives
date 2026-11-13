import { paintWeather } from './renderers/weather';
import { paintVarroa } from './renderers/varroa';
import { paintClimate } from './renderers/climate';
import { paintPesticides } from './renderers/pesticides';
import { paintImprovement } from './renderers/improvement';
import type { DiceEffectType } from './types';
import type { EffectPainter } from './drawing';

export const EFFECT_PAINTERS: Record<DiceEffectType, EffectPainter> = {
  extremeWeather: paintWeather, varroaMite: paintVarroa, climateChange: paintClimate, pesticides: paintPesticides, improvement: paintImprovement,
};
