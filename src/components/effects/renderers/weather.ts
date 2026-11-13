import { noise, type EffectPainter } from '../drawing';

export const paintWeather: EffectPainter = ({ ctx, width, height, t, p, fade, effect }) => {
  ctx.fillStyle = `rgba(39,55,65,${0.16 * fade})`; ctx.fillRect(0, 0, width, height);
  const cloud = ctx.createLinearGradient(0, 0, 0, height * 0.45);
  cloud.addColorStop(0, `rgba(55,70,80,${0.25 * fade})`); cloud.addColorStop(1, 'rgba(55,70,80,0)');
  ctx.fillStyle = cloud; ctx.fillRect(0, 0, width, height * 0.45);
  ctx.fillStyle = `rgba(80,95,105,${fade * 0.18})`;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(((i * width / 4 + t * 30) % (width + 250)) - 100, 15 + noise(effect.id, i) * 45, 130, 25, 0, 0, Math.PI * 2); ctx.fill(); }
  const heavy = p > 0.15 && p < 0.65 ? 1 : 0.65;
  const count = Math.min(width < 600 ? 90 : 190, Math.ceil(width * height / 2400));
  ctx.lineWidth = 1.4; ctx.strokeStyle = `rgba(175,220,245,${0.7 * fade * heavy})`;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const speed = 240 + noise(effect.id, i + 20) * 310;
    const x = (noise(effect.id, i + 100) * (width + 200) + t * speed * 0.6) % (width + 200) - 100;
    const y = (noise(effect.id, i + 300) * (height + 80) + t * speed) % (height + 80) - 40;
    ctx.moveTo(x, y); ctx.lineTo(x + 10, y + 22);
  }
  ctx.stroke();
  ctx.strokeStyle = `rgba(249,246,231,${0.35 * fade})`; ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const x = ((t * (130 + i * 17) + i * 130) % (width + 220)) - 200;
    const y = height * (0.12 + noise(effect.id, i + 500) * 0.75);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 45, y - 14, x + 100, y + 14, x + 170, y - 6); ctx.stroke();
  }
};
