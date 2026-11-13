import { drawSprite } from '../sprites';
import { clamp, type EffectPainter } from '../drawing';

export const paintClimate: EffectPainter = ({ ctx, width, height, t, p, fade, sprites }) => {
  ctx.fillStyle = `rgba(255,109,58,${fade * clamp(p * 2) * 0.13})`; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = `rgba(255,160,75,${fade * 0.16})`; ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    for (let j = 0; j <= 30; j++) {
      const y = j * height / 30, x = width * (0.2 + i * 0.1) + Math.sin(j * 0.45 + t * 2.5 + i) * 8;
      if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  const thermometerHeight = Math.min(width < 600 ? 165 : 215, height * 0.65);
  ctx.save(); ctx.globalAlpha = fade;
  // The destination rectangle NEVER changes between thermometer frames.
  drawSprite(ctx, sprites, 'thermometer', Math.min(11, Math.floor(clamp(p / 0.7) * 12)), width * 0.045, (height - thermometerHeight) / 2, thermometerHeight * 210 / 405, thermometerHeight);
  ctx.restore();
};
