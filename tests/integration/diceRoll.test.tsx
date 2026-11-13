// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, useEffect } from 'react';
import type { DiceCanvasProps } from '../../src/components/scene/DiceCanvas';
import { DicePanel } from '../../src/components/ui/DicePanel';
import { EventNotice } from '../../src/components/ui/EventNotice';
import { EVENT_NOTICE_MS, REDUCED_ROLL_DURATION_MS, ROLL_DURATION_MS } from '../../src/game/config/dice';
import { useGameStore } from '../../src/store/gameStore';
import { readyGame } from '../fixtures/game';
import { decodeSave, encodeSave } from '../../src/game/persistence/saveGame';

vi.mock('../../src/components/scene/DiceCanvas', () => ({ default: ({ roll, reducedMotion, onSettled }: DiceCanvasProps) => {
  useEffect(() => {
    if (!roll) return;
    const timer = setTimeout(() => onSettled(roll.id), (reducedMotion ? REDUCED_ROLL_DURATION_MS : ROLL_DURATION_MS) + 16);
    return () => clearTimeout(timer);
  }, [roll?.id]);
  return <div>Die renderer</div>;
} }));
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} }); useGameStore.getState().reset(); useGameStore.setState(readyGame()); });
afterEach(() => { cleanup(); useGameStore.getState().reset(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('keeps the board and save unchanged until settling and commits each roll once', () => {
  const game = () => useGameStore.getState();
  const original = encodeSave(game());
  const rng = vi.fn(() => 0.01);
  game().startDiceRoll(rng);
  const id = game().diceAnimation!.id;
  game().startDiceRoll(rng); game().rollDice(rng); game().chooseAction('bee');
  game().handleBoardTile('tile-1-0', { q: 1, r: 0 });
  expect(rng).toHaveBeenCalledTimes(2); // One die draw and one existing target draw.
  expect(encodeSave(game())).toBe(original);
  expect(game().eventNotice).toBeNull();
  game().completeDiceRoll(id);
  expect(game().hives[0].damaged).toBe(true);
  expect(game().eventNotice!.message).toBe(game().message);
  expect(decodeSave(encodeSave(game())).snapshot?.hives[0].damaged).toBe(true);
  const committed = encodeSave(game());
  game().completeDiceRoll(id);
  expect(encodeSave(game())).toBe(committed);
});

it('disables repeat clicks, applies effects after the animation, and removes the message automatically', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.01);
  render(<StrictMode><DicePanel /><EventNotice /></StrictMode>);
  const roll = screen.getByRole('button', { name: 'Roll Dice' }) as HTMLButtonElement;
  expect(screen.queryByRole('img')).toBeNull();
  fireEvent.click(roll); fireEvent.click(roll);
  await act(async () => { await Promise.resolve(); });
  expect(roll.disabled).toBe(true);
  expect(screen.queryByRole('heading', { name: 'Varroa mite!' })).toBeNull();
  act(() => { vi.advanceTimersByTime(ROLL_DURATION_MS - 1); });
  expect(useGameStore.getState().hives[0].damaged).toBe(false);
  act(() => { vi.advanceTimersByTime(51); });
  expect(screen.getByRole('heading', { name: 'Varroa mite!' })).toBeTruthy();
  expect(screen.getByRole('status').textContent).toContain(useGameStore.getState().message);
  act(() => { vi.advanceTimersByTime(EVENT_NOTICE_MS); });
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.queryByRole('img')).toBeNull();
  expect(useGameStore.getState().hives).toHaveLength(4);
});

it('cleans timers on unmount and ignores a stale completion after reset', () => {
  const { unmount } = render(<DicePanel />);
  act(() => useGameStore.getState().startDiceRoll(() => 0.01));
  const id = useGameStore.getState().diceAnimation!.id;
  unmount();
  act(() => { vi.advanceTimersByTime(10000); });
  expect(useGameStore.getState().dieResult).toBeNull();
  useGameStore.getState().reset();
  useGameStore.getState().completeDiceRoll(id);
  expect(useGameStore.getState().phase).toBe('playerSetup');
  expect(useGameStore.getState().eventNotice).toBeNull();
});

it('keeps a newer notification when an older timer requests dismissal', () => {
  useGameStore.getState().startDiceRoll(() => 0.01);
  const first = useGameStore.getState().diceAnimation!.id;
  useGameStore.getState().completeDiceRoll(first);
  render(<EventNotice />);
  act(() => { vi.advanceTimersByTime(1000); });
  act(() => useGameStore.setState({ eventNotice: { id: first + 1, event: 'garden', message: 'Choose a free tile.' } }));
  act(() => { useGameStore.getState().dismissEventNotice(first); vi.advanceTimersByTime(2200); });
  expect(screen.getByRole('status').textContent).toContain('Choose a free tile.');
  act(() => { vi.advanceTimersByTime(900); });
  expect(screen.queryByRole('status')).toBeNull();
});

it('waits for a lazily mounted garden instead of displaying a viewport-sized die preview', async () => {
  const tree = render(<main className="game-screen"><DicePanel /></main>);
  const board = document.createElement('div');
  board.className = 'game-board-canvas';
  board.getBoundingClientRect = () => new DOMRect(20, 100, 700, 500);
  board.scrollIntoView = vi.fn();
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Roll Dice' }));
    expect(screen.queryByRole('img')).toBeNull();
    await act(async () => { document.body.appendChild(board); await Promise.resolve(); });
    const stage = screen.getByRole('img') as HTMLElement;
    expect(stage.style.left).toBe('20px');
    expect(stage.style.width).toBe('700px');
    expect(board.scrollIntoView).toHaveBeenCalled();
    expect(useGameStore.getState().dieResult).toBeNull();
  } finally { tree.unmount(); board.remove(); }
});
