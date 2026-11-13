import type { DiceEffect } from './types';
import type { SpriteImages } from './sprites';
export interface EffectFrame { ctx: CanvasRenderingContext2D; width: number; height: number; t: number; p: number; fade: number; effect: DiceEffect; sprites: SpriteImages; targets: Array<{ x: number; y: number }> }
export type EffectPainter = (frame: EffectFrame) => void;
export const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const envelope = (p: number) => Math.min(clamp(p / 0.12), clamp((1 - p) / 0.22));
// Independent visual noise. Never consume Math.random or the game RNG.
export function noise(seed: number, index: number) { const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453; return x - Math.floor(x); }
export function disk(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
