import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { DIE_EVENTS, REDUCED_ROLL_DURATION_MS, ROLL_DURATION_MS } from '../../game/config/dice';
import { useGameStore } from '../../store/gameStore';
import { useReducedMotion } from './useReducedMotion';
import { useBoardBounds } from './useBoardBounds';

const DiceCanvas = lazy(() => import('../scene/DiceCanvas'));

class DiceBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function DicePanel() {
  const roll = useGameStore(s => s.diceAnimation);
  const phase = useGameStore(s => s.turnPhase);
  const outcome = useGameStore(s => s.outcome);
  const start = useGameStore(s => s.startDiceRoll);
  const complete = useGameStore(s => s.completeDiceRoll);
  const reducedMotion = useReducedMotion();
  const [useFallback, setUseFallback] = useState(false);
  // Download/cache the model without mounting a canvas or showing an idle die.
  useEffect(() => { void import('../scene/DiceCanvas').catch(() => {}); }, []);
  const boardBounds = useBoardBounds(Boolean(roll), true, true);
  const face = roll?.result ?? 5;
  useEffect(() => {
    if (!roll) return;
    const duration = reducedMotion ? REDUCED_ROLL_DURATION_MS : ROLL_DURATION_MS;
    // Healthy WebGL rolls finish after painting and holding the landed face.
    // Only the explicit error fallback uses a timer to finish the roll.
    const timer = window.setTimeout(() => {
      if (useFallback) complete(roll.id);
    }, Math.max(0, duration + 50 - (Date.now() - roll.startedAt)));
    // Handle a lost context or a paused render loop without leaving the turn stuck.
    const watchdog = window.setTimeout(() => {
      setUseFallback(true); complete(roll.id);
    }, Math.max(0, duration + 4000 - (Date.now() - roll.startedAt)));
    return () => { window.clearTimeout(timer); window.clearTimeout(watchdog); };
  }, [roll?.id, reducedMotion, complete, useFallback]);
  const fallback = <span className={`dice-fallback dice-face-art dice-symbol-${DIE_EVENTS[face - 1]}`} aria-hidden="true" />;
  return <section className="dice-panel" aria-labelledby="dice-title" aria-busy={Boolean(roll)}>
    <h2 id="dice-title">Roll Dice</h2>
    {roll && boardBounds && createPortal(<div className="dice-stage dice-stage-rolling" style={boardBounds} role="img" aria-label={reducedMotion ? 'Environmental die revealing the result' : 'Environmental die rolling across the garden'}>
      {useFallback ? fallback : <DiceBoundary fallback={fallback} onFailure={() => setUseFallback(true)}><Suspense fallback={null}><DiceCanvas face={face} roll={roll} reducedMotion={reducedMotion} tabletop onSettled={complete} /></Suspense></DiceBoundary>}
    </div>, document.body)}
    <button data-tour="roll" type="button" className="primary-button full-width" disabled={phase !== 'roll' || Boolean(outcome) || Boolean(roll)} onClick={() => {
      document.querySelector('.game-board-canvas')?.scrollIntoView({ block: 'center', behavior: 'instant' });
      start();
    }}>Roll Dice</button>
  </section>;
}
