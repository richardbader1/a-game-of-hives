import { drawSprite } from '../sprites';
import { clamp, lerp, noise, type EffectPainter } from '../drawing';

export const paintVarroa: EffectPainter = ({ ctx, width, height, t, p, fade, sprites, effect, targets }) => {
  const count = width < 600 ? 12 : 20;
  for (let i = 0; i < count; i++) {
    const n = (offset: number) => noise(effect.id, i * 19 + offset);
    const size = lerp(width < 600 ? 22 : 28, width < 600 ? 32 : 43, n(1));
    const horizontal = i % 4 < 2;
    const startX = horizontal ? (i % 2 ? width + size : -size) : n(2) * width;
    const startY = horizontal ? n(3) * height : (i % 2 ? height + size : -size);
    const endX = horizontal ? width - startX : n(4) * width;
    const endY = horizontal ? n(5) * height : height - startY;
    const travel = clamp((p - n(6) * 0.08) * (1.05 + n(7) * 0.25));
    let x = lerp(startX, endX, travel), y = lerp(startY, endY, travel);
    if (i < 5 && targets.length) {
      const target = targets[i % targets.length];
      x = travel < 0.65 ? lerp(startX, target.x * width, travel / 0.65) : lerp(target.x * width, endX, (travel - 0.65) / 0.35);
      y = travel < 0.65 ? lerp(startY, target.y * height, travel / 0.65) : lerp(target.y * height, endY, (travel - 0.65) / 0.35);
    }
    const drift = Math.sin(t * (4 + n(8) * 3) + i) * 5;
    x += drift; y += Math.cos(t * 3 + i) * 4;
    ctx.save(); ctx.globalAlpha = fade; ctx.translate(x, y);
    ctx.rotate(Math.atan2(endY - startY, endX - startX) + Math.sin(t * 3 + i) * 0.12);
    drawSprite(ctx, sprites, 'mite', Math.floor(t * 13 + i), -size / 2, -size / 2, size, size);
    ctx.restore();
  }
};
