import { noise, type EffectPainter } from '../drawing';

const COLORS = ['#00BC74', '#FFCD1F', '#4C34E5', '#FF6D3A', '#6BE7BE'];
export const paintImprovement: EffectPainter = ({ ctx, width, height, t, fade, effect }) => {
  if (!effect.positive) return; // Exhausted garden supply must not imply a successful expansion.
  const count = width < 600 ? 55 : 95;
  for (let i = 0; i < count; i++) {
    const seed = effect.id + 7;
    const age = Math.max(0, t - noise(seed, i) * 0.45);
    const side = i % 2;
    const vx = (side ? -1 : 1) * (35 + noise(seed, i + 100) * width * 0.2);
    const x = (side ? width * 0.92 : width * 0.08) + vx * age + Math.sin(age * 3 + i) * 12;
    const y = 10 - (75 + noise(seed, i + 200) * 90) * age + (75 + noise(seed, i + 300) * 30) * age * age;
    ctx.save(); ctx.globalAlpha = fade; ctx.translate(x, y); ctx.rotate(age * (2 + noise(seed, i + 400) * 5));
    ctx.fillStyle = COLORS[i % COLORS.length]; ctx.fillRect(-3, -4, 6 * Math.max(0.25, Math.abs(Math.cos(age * 5 + i))), 9); ctx.restore();
  }
};
