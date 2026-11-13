// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { DiceEffectsManager } from '../../src/components/effects/DiceEffectsManager';
import { useGameStore } from '../../src/store/gameStore';
import { readyGame } from '../fixtures/game';
import { encodeSave } from '../../src/game/persistence/saveGame';

const callbacks = vi.hoisted(() => new Map<number, () => void>());
vi.mock('../../src/components/effects/sprites', () => ({ preloadEffectSprites: () => Promise.resolve({}) }));
vi.mock('../../src/components/effects/DiceEffectsLayer', () => ({ DiceEffectsLayer: ({ effect, onComplete }: any) => { callbacks.set(effect.id, onComplete); return <div data-testid="effect" data-id={effect.id}>{effect.type}</div>; } }));
beforeEach(() => { callbacks.clear(); useGameStore.getState().reset(); useGameStore.setState(readyGame()); });
afterEach(() => { cleanup(); useGameStore.getState().reset(); });

it('starts only after commitment, ignores duplicate IDs, and survives notice dismissal', () => {
  render(<DiceEffectsManager><p>Game</p></DiceEffectsManager>);
  act(() => useGameStore.getState().startDiceRoll(() => 0));
  const id = useGameStore.getState().diceAnimation!.id;
  expect(screen.queryByTestId('effect')).toBeNull();
  act(() => useGameStore.getState().completeDiceRoll(id));
  expect(screen.getByTestId('effect').textContent).toBe('varroaMite');
  const snapshot = encodeSave(useGameStore.getState());
  act(() => { useGameStore.getState().completeDiceRoll(id); useGameStore.getState().dismissEventNotice(id); });
  expect(screen.getByTestId('effect').getAttribute('data-id')).toBe(String(id));
  act(() => callbacks.get(id)!());
  expect(screen.queryByTestId('effect')).toBeNull();
  expect(encodeSave(useGameStore.getState())).toBe(snapshot);
});
it('cancels on a new roll/reset and prevents a stale completion from clearing a newer effect', () => {
  render(<DiceEffectsManager><p>Game</p></DiceEffectsManager>);
  act(() => { const s = useGameStore.getState(); s.startDiceRoll(() => 0); useGameStore.getState().completeDiceRoll(useGameStore.getState().diceAnimation!.id); });
  const first = Number(screen.getByTestId('effect').getAttribute('data-id'));
  act(() => { useGameStore.setState(readyGame()); useGameStore.getState().startDiceRoll(() => 0.99); });
  expect(screen.queryByTestId('effect')).toBeNull();
  act(() => useGameStore.getState().completeDiceRoll(useGameStore.getState().diceAnimation!.id));
  expect(screen.getByTestId('effect').textContent).toBe('improvement');
  act(() => callbacks.get(first)!());
  expect(screen.getByTestId('effect').textContent).toBe('improvement');
  act(() => useGameStore.getState().reset());
  expect(screen.queryByTestId('effect')).toBeNull();
});
it('can preview independently without changing or following game state', () => {
  const before = encodeSave(useGameStore.getState());
  render(<DiceEffectsManager effect={{ id: 999, type: 'pesticides', startedAt: 0, duration: 5000, positive: true, targets: [] }}><p>Preview</p></DiceEffectsManager>);
  expect(screen.getByTestId('effect').textContent).toBe('pesticides');
  expect(encodeSave(useGameStore.getState())).toBe(before);
});
