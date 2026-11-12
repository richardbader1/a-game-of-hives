// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardDestinations } from '../../src/components/ui/BoardDestinations';
import { InventoryToolbar } from '../../src/components/ui/InventoryToolbar';
import { SavedGamePrompt } from '../../src/components/setup/SavedGamePrompt';
import { useGameStore } from '../../src/store/gameStore';
import { useSessionStore } from '../../src/store/sessionStore';
import { readyGame } from '../fixtures/game';

beforeEach(() => {
  useGameStore.getState().reset(); useGameStore.setState(readyGame());
  useSessionStore.setState({ savedGame: null, notice: null });
});
afterEach(cleanup);

it('moves the bee through keyboard controls and updates inventory', async () => {
  const user = userEvent.setup();
  useGameStore.getState().rollDice(() => 0.01);
  useGameStore.getState().chooseAction('bee');
  render(<BoardDestinations />);
  const summary = screen.getByText('Board controls (keyboard and screen reader)');
  summary.focus(); await user.keyboard('{Enter}');
  const destination = screen.getByRole('button', { name: /Move bee to Nectar at 1, 0/ });
  destination.focus(); await user.keyboard('{Enter}');
  expect(useGameStore.getState().beeTileId).toBe('tile-1-0');
  expect(useGameStore.getState().inventory.nectar).toBe(2);
});

it('places a free event tile and completes a pending hive purchase through DOM controls', async () => {
  const user = userEvent.setup();
  useGameStore.getState().rollDice(() => 0.99);
  render(<BoardDestinations />);
  await user.click(screen.getByText('Board controls (keyboard and screen reader)'));
  await user.click(screen.getAllByRole('button', { name: /Place pollen at/ })[0]);
  expect(useGameStore.getState().tiles.length).toBe(6);
  expect(useGameStore.getState().actionCategoriesUsed).toEqual([]);
  const game = useGameStore.getState();
  game.chooseAction('bee'); useGameStore.getState().skipCurrentAction();
  useGameStore.getState().chooseAction('garden'); useGameStore.getState().skipCurrentAction();
  useGameStore.setState({ inventory: { pollen: 0, nectar: 0, water: 0, honey: 2, beeBread: 3 } });
  useGameStore.getState().beginHivePurchase();
  await user.click(await screen.findAllByRole('button', { name: /Place hive on/ }).then(items => items[0]));
  expect(useGameStore.getState().hives.length).toBe(5);
  expect(useGameStore.getState().inventory.honey).toBe(0);
});

it('opens recipes by keyboard and prevents purchasing before trading', async () => {
  const user = userEvent.setup();
  useGameStore.setState({ inventory: { pollen: 5, nectar: 5, water: 5, honey: 0, beeBread: 0 } });
  render(<InventoryToolbar />);
  await user.tab(); await user.tab(); await user.tab(); // Focus the labelled resource counters first.
  await user.tab();
  expect(screen.getByRole('dialog', { name: 'Honey recipe' })).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Available during trading' }) as HTMLButtonElement).disabled).toBe(true);
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('requires an explicit resume and protects the saved game from accidental replacement', async () => {
  const user = userEvent.setup();
  useGameStore.getState().reset(); useSessionStore.setState({ savedGame: readyGame() });
  render(<SavedGamePrompt />);
  await user.click(screen.getByRole('button', { name: 'Start a new game' }));
  expect(useSessionStore.getState().savedGame).not.toBeNull();
  await user.click(screen.getByRole('button', { name: 'Keep saved game' }));
  await user.click(screen.getByRole('button', { name: 'Resume saved game' }));
  expect(useGameStore.getState().phase).toBe('ready');
});
