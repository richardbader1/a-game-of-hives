import { useEffect, useRef, type MutableRefObject } from 'react';
import { createPortal } from 'react-dom';
import { useBoardBounds } from '../ui/useBoardBounds';
import { preloadEffectSprites, type SpriteImages } from './sprites';
import { EFFECT_LABELS, type DiceEffect } from './types';
import { EFFECT_PAINTERS } from './registry';
import { clamp, envelope } from './drawing';

export function DiceEffectsLayer({ effect, reducedMotion, projected, invalidate, onComplete }: {
  effect: DiceEffect; reducedMotion: boolean;
  projected: MutableRefObject<Array<{ x: number; y: number }>>;
  invalidate: MutableRefObject<(() => void) | null>; onComplete: () => void;
}) {
  const bounds = useBoardBounds(true);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sprites = useRef<SpriteImages>({});
  useEffect(() => { let alive = true; void preloadEffectSprites().then(images => { if (alive) sprites.current = images; }); return () => { alive = false; }; }, []);
  useEffect(() => {
    const remaining = Math.max(0, effect.duration - (performance.now() - effect.startedAt));
    const timer = window.setTimeout(onComplete, remaining + 40);
    return () => window.clearTimeout(timer);
  }, [effect.id, effect.duration, effect.startedAt, onComplete]);
  useEffect(() => {
    if (!bounds || reducedMotion) return;
    const node = canvas.current, ctx = node?.getContext('2d'); if (!node || !ctx) return;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    node.width = Math.round(bounds.width * dpr); node.height = Math.round(bounds.height * dpr);
    let frame = 0, last = -Infinity;
    const paint = (now: number) => {
      const elapsed = now - effect.startedAt;
      if (elapsed >= effect.duration) { ctx.clearRect(0, 0, node.width, node.height); onComplete(); return; }
      if (now - last >= 1000 / 30) {
        last = now; const p = clamp(elapsed / effect.duration);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, bounds.width, bounds.height);
        ctx.save();
        EFFECT_PAINTERS[effect.type]({ ctx, width: bounds.width, height: bounds.height, t: elapsed / 1000, p, fade: envelope(p), effect, sprites: sprites.current, targets: projected.current });
        ctx.restore();
        ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255,205,31,${envelope(p) * 0.85})`;
        for (const point of projected.current) { ctx.beginPath(); ctx.ellipse(point.x * bounds.width, point.y * bounds.height, 28, 17, 0, 0, Math.PI * 2); ctx.stroke(); }
        invalidate.current?.();
      }
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => { cancelAnimationFrame(frame); ctx.clearRect(0, 0, node.width, node.height); };
  }, [bounds, effect, reducedMotion, onComplete, projected, invalidate]);
  const board = document.querySelector('.game-board-canvas');
  if (!bounds || !board) return null;
  // Stay inside the board's stacking context: sticky inventory, menus and
  // notifications must remain above weather/sprites even while the page scrolls.
  return createPortal(<div className="dice-effects-layer" data-effect={effect.type} data-effect-id={effect.id} style={{ left: 0, top: 0, width: bounds.width, height: bounds.height }} aria-hidden="true">
    {reducedMotion ? <div className={`dice-effect-static static-${effect.type}`}><span>{EFFECT_LABELS[effect.type]}</span></div> : <canvas ref={canvas} />}
  </div>, board);
}
