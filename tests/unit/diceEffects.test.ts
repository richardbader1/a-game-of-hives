import { expect, it, vi } from 'vitest';
import { affectedCoordinates, EFFECT_DURATIONS, effectForEvent } from '../../src/components/effects/types';
import { SPRITES, spriteFrame } from '../../src/components/effects/sprites';
import { pesticidePose } from '../../src/components/effects/renderers/pesticides';
import { paintClimate } from '../../src/components/effects/renderers/climate';
import { noise, type EffectFrame } from '../../src/components/effects/drawing';
import { readyGame } from '../fixtures/game';
import { rollAndResolveEvent } from '../../src/game/engine/gameEngine';

it('maps the existing events and keeps all effects between three and five seconds', () => {
  expect(['varroa', 'climate', 'pesticides', 'movementRestriction', 'garden'].map(event => effectForEvent(event as any))).toEqual(['varroaMite', 'climateChange', 'pesticides', 'extremeWeather', 'improvement']);
  expect(Object.values(EFFECT_DURATIONS).every(ms => ms >= 3000 && ms <= 5000)).toBe(true);
});
it('finds real damaged/destroyed targets without fabricating a target for a blocked event', () => {
  const before = readyGame();
  expect(affectedCoordinates(before, rollAndResolveEvent(before, () => 0))).toEqual([{ q: 0, r: 0 }]);
  const protectedGame = { ...before, hives: before.hives.map(h => ({ ...h, smartHive: true })) };
  expect(affectedCoordinates(protectedGame, rollAndResolveEvent(protectedGame, () => 0))).toEqual([]);
  const destroyed = { ...before, tiles: before.tiles.slice(1), hives: before.hives.slice(1) };
  expect(affectedCoordinates(before, destroyed)).toEqual([{ q: 0, r: 0 }]);
});
it('keeps corrected sprite rectangles inside the supplied sheets', () => {
  const sizes = { mite: [1536, 1024], thermometer: [840, 1215], walk: [1404, 268], spray: [1404, 272] };
  for (const name of Object.keys(SPRITES) as Array<keyof typeof SPRITES>) for (let i = 0; i < SPRITES[name].columns * SPRITES[name].rows; i++) {
    const f = spriteFrame(name, i); expect(f.x).toBeGreaterThanOrEqual(0); expect(f.y).toBeGreaterThanOrEqual(0);
    expect(f.x + f.width).toBeLessThanOrEqual(sizes[name][0]); expect(f.y + f.height).toBeLessThanOrEqual(sizes[name][1]);
  }
});
it('keeps the thermometer housing destination fixed while the temperature frame rises', () => {
  const drawImage = vi.fn();
  const ctx = { fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), save: vi.fn(), restore: vi.fn(), drawImage } as unknown as CanvasRenderingContext2D;
  const base = { ctx, width: 800, height: 500, t: 0, p: 0, fade: 1, sprites: { thermometer: {} as HTMLImageElement }, effect: { id: 1, type: 'climateChange', startedAt: 0, duration: 4400, targets: [], positive: true }, targets: [] } as EffectFrame;
  for (const p of [0, 0.3, 0.6, 0.9]) paintClimate({ ...base, p });
  expect(new Set(drawImage.mock.calls.map(args => JSON.stringify(args.slice(5))))).toHaveLength(1);
  expect(new Set(drawImage.mock.calls.map(args => JSON.stringify(args.slice(1, 3)))).size).toBeGreaterThan(1);
});
it('walks in, stops to spray at a fixed foot baseline/nozzle, then walks out', () => {
  const enter = pesticidePose(0, 800, 500), sprayA = pesticidePose(0.3, 800, 500), sprayB = pesticidePose(0.6, 800, 500), exit = pesticidePose(1, 800, 500);
  expect(enter.x).toBeLessThan(0); expect(exit.x).toBeGreaterThan(800);
  expect(sprayA).toEqual(sprayB); expect(sprayA.spraying).toBe(true);
  expect(sprayA.nozzleX).toBeGreaterThan(sprayA.x);
  expect([enter, sprayA, sprayB, exit].map(p => p.baseline)).toEqual([430, 430, 430, 430]);
});
it('uses deterministic decoration noise without consuming the game random generator', () => {
  const random = vi.spyOn(Math, 'random');
  expect(noise(42, 7)).toBe(noise(42, 7)); expect(noise(42, 7)).toBeGreaterThanOrEqual(0); expect(noise(42, 7)).toBeLessThan(1);
  expect(random).not.toHaveBeenCalled(); random.mockRestore();
});
