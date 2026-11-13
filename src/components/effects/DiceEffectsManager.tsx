import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useReducedMotion } from '../ui/useReducedMotion';
import { affectedCoordinates, EFFECT_DURATIONS, effectForEvent, type DiceEffect } from './types';
import { DiceEffectsLayer } from './DiceEffectsLayer';
import { preloadEffectSprites } from './sprites';

interface EffectsContextValue {
  effect: DiceEffect | null;
  reducedMotion: boolean;
  projectTargets: (points: Array<{ x: number; y: number }>) => void;
  registerInvalidation: (invalidate: (() => void) | null) => void;
}
const EffectsContext = createContext<EffectsContextValue>({ effect: null, reducedMotion: false, projectTargets: () => {}, registerInvalidation: () => {} });
export const useDiceEffects = () => useContext(EffectsContext);

/** Controlled playback is independent of the store; normal playback consumes commits once. */
export function DiceEffectsManager({ children, effect: controlled, onComplete }: { children: ReactNode; effect?: DiceEffect | null; onComplete?: () => void }) {
  const [live, setLive] = useState<DiceEffect | null>(null);
  const reducedMotion = useReducedMotion();
  const lastSeen = useRef<number | null>(null);
  const projected = useRef<Array<{ x: number; y: number }>>([]);
  const invalidation = useRef<(() => void) | null>(null);
  const projectTargets = useCallback((points: Array<{ x: number; y: number }>) => { projected.current = points; }, []);
  const registerInvalidation = useCallback((callback: (() => void) | null) => { invalidation.current = callback; }, []);
  useEffect(() => { void preloadEffectSprites(); }, []);
  useEffect(() => {
    if (controlled !== undefined) return;
    return useGameStore.subscribe((next, previous) => {
      if (next.phase !== 'ready' || (next.diceAnimation && next.diceAnimation.id !== previous.diceAnimation?.id)) { setLive(null); return; }
      const notice = next.eventNotice;
      if (!notice || notice.id === previous.eventNotice?.id || notice.id === lastSeen.current) return;
      lastSeen.current = notice.id;
      const type = effectForEvent(notice.event);
      projected.current = [];
      setLive({ id: notice.id, type, startedAt: performance.now(), duration: EFFECT_DURATIONS[type], targets: affectedCoordinates(previous, next), positive: type !== 'improvement' || next.turnPhase === 'eventPlacement' });
    });
  }, [controlled]);
  const effect = controlled === undefined ? live : controlled;
  const latestId = useRef<number | undefined>(); latestId.current = effect?.id;
  const finished = useCallback(() => {
    if (latestId.current !== effect?.id) return;
    if (controlled === undefined) setLive(current => current?.id === effect?.id ? null : current);
    else onComplete?.();
  }, [controlled, onComplete, effect?.id]);
  return <EffectsContext.Provider value={{ effect, reducedMotion, projectTargets, registerInvalidation }}>
    {children}
    {effect && <DiceEffectsLayer key={effect.id} effect={effect} reducedMotion={reducedMotion} projected={projected} invalidate={invalidation} onComplete={finished} />}
  </EffectsContext.Provider>;
}
