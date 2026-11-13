// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { Tutorial, tutorialStep } from '../../src/components/ui/Tutorial';
import { GameHUD } from '../../src/components/ui/GameHUD';
import { HivePlacement } from '../../src/components/setup/HivePlacement';
import { useGameStore } from '../../src/store/gameStore';
import { useTutorialStore } from '../../src/store/tutorialStore';
import { readyGame } from '../fixtures/game';
import { rollAndResolveEvent } from '../../src/game/engine/gameEngine';

vi.mock('../../src/components/scene/DiceCanvas', () => ({ default: () => null }));

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  useGameStore.setState(readyGame());
  useTutorialStore.getState().start();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); useTutorialStore.getState().skip(); });

it.each([0, 1, 2, 3, 4, 5])('explains actual die face %i without rerolling or mutating it', face => {
  const state = rollAndResolveEvent(readyGame(), () => (face + 0.1) / 6);
  const snapshot = JSON.stringify(state);
  const step = tutorialStep(state, []);
  expect(step.id).toBe(`event-${state.roundNumber}-${state.currentPlayerIndex}`);
  expect(step.body.length).toBeGreaterThan(30);
  expect(step.instruction).toContain(state.message);
  expect(JSON.stringify(state)).toBe(snapshot);
});

it('places exactly one demonstration hive through the validated setup command, including StrictMode', () => {
  useGameStore.setState({ ...readyGame(), phase: 'hiveSetup', hives: [] });
  const { unmount } = render(<StrictMode><HivePlacement /></StrictMode>);
  expect(useGameStore.getState().hives).toHaveLength(1);
  expect(useGameStore.getState().tiles.some(t => t.id === useGameStore.getState().hives[0].tileId)).toBe(true);
  unmount();
  useTutorialStore.getState().skip();
  useGameStore.setState({ hives: [] });
  render(<HivePlacement />);
  expect(useGameStore.getState().hives).toHaveLength(0);
});

it('guides real collection, affordable trading, teammate handoff and a full round without altering rules', async () => {
  const user = userEvent.setup();
  render(<><GameHUD /><Tutorial /></>);
  act(() => useGameStore.getState().rollDice(() => 0.01));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(screen.getByRole('button', { name: 'Bee' }));
  await user.click(screen.getByRole('button', { name: /Move bee to Nectar at 1, 0/ }));
  expect(screen.getByRole('heading', { name: 'Collected: +2 nectar' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(screen.getByRole('button', { name: 'Beekeeper' }));
  await user.click(screen.getByRole('button', { name: /Move beekeeper to Pollen at 0, 0/ }));
  await user.click(screen.getByRole('button', { name: 'Install smart hive' }));
  expect(screen.getByRole('heading', { name: 'Turn resources into points' })).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Make honey' }) as HTMLButtonElement).disabled).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Finish trading & turn' }));
  expect(screen.getByRole('heading', { name: 'Pass the turn to your teammate' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Next' }));
  act(() => useGameStore.getState().rollDice(() => 0.99));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('heading', { name: 'Grow more bee habitat' })).toBeTruthy();
  await user.click(screen.getAllByRole('button', { name: /Place pollen at/ })[0]);
  expect(useGameStore.getState().actionCategoriesUsed).toHaveLength(0);
  for (const category of ['Bee', 'Garden']) {
    await user.click(screen.getByRole('button', { name: category }));
    await user.click(screen.getByRole('button', { name: 'Skip this action' }));
  }
  await user.click(screen.getByRole('button', { name: 'Finish trading & turn' }));
  expect(screen.getByRole('heading', { name: 'Your first round is complete!' })).toBeTruthy();
  const snapshot = JSON.stringify(useGameStore.getState());
  await user.click(screen.getByRole('button', { name: 'Continue Playing' }));
  expect(screen.queryByLabelText('Guided tutorial')).toBeNull();
  expect(JSON.stringify(useGameStore.getState())).toBe(snapshot);
});

it('supports back review and safe escape when a spotlight target is missing', async () => {
  const user = userEvent.setup();
  render(<Tutorial />); // Roll button deliberately absent.
  act(() => useGameStore.getState().rollDice(() => 0.51));
  await user.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('heading', { name: 'Discover what the garden needs' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Return to current step' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByText(/Try Beekeeper or Garden/)).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Show me where' }));
  await user.keyboard('{Escape}');
  expect(useTutorialStore.getState().active).toBe(false);
  expect(useGameStore.getState().eventRestriction).toBe('noBeeMove');
});
