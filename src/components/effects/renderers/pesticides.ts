import { drawPerson } from '../sprites';
import { clamp, disk, lerp, noise, type EffectPainter } from '../drawing';

export function pesticidePose(p: number, width: number, height: number) {
  const scale = Math.min(width < 600 ? 125 : 155, height * 0.43) / 272;
  const stop = width * 0.27;
  const spraying = p >= 0.25 && p < 0.7;
  const x = p < 0.25 ? lerp(-100 * scale, stop, clamp(p / 0.25)) : spraying ? stop : lerp(stop, width + 150 * scale, clamp((p - 0.7) / 0.3));
  const baseline = height * 0.86;
  return { x, baseline, scale, spraying, nozzleX: x + 95 * scale, nozzleY: baseline - 135 * scale };
}
export const paintPesticides: EffectPainter = ({ ctx, width, height, t, p, fade, sprites, effect }) => {
  const pose = pesticidePose(p, width, height);
  ctx.save(); ctx.globalAlpha = fade;
  drawPerson(ctx, sprites, pose.spraying ? 'spray' : 'walk', Math.floor(t * (pose.spraying ? 9 : 11)), pose.x, pose.baseline, pose.scale);
  if (p > 0.28 && p < 0.91) {
    const release = clamp((0.91 - p) / 0.15);
    for (let i = 0; i < 45; i++) {
      const age = ((t * 0.8 + noise(effect.id, i)) % 1);
      const spread = age * width * 0.42;
      const x = width * 0.27 + 95 * pose.scale + spread;
      const y = pose.nozzleY + (noise(effect.id, i + 90) - 0.5) * age * height * 0.25 - age * 8;
      const radius = 4 + age * 20;
      disk(ctx, x, y, radius, `rgba(210,230,218,${(1 - age) * 0.16 * release})`);
    }
  }
  ctx.restore();
};
