// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { GardenBuilder } from '../../src/components/setup/GardenBuilder';
import { GardenDragProvider, useGardenDrag } from '../../src/components/setup/GardenDrag';
import { Tutorial } from '../../src/components/ui/Tutorial';
import { InventoryToolbar } from '../../src/components/ui/InventoryToolbar';
import { RESOURCE_DESCRIPTIONS } from '../../src/components/ui/resourceDescriptions';
import { useGameStore } from '../../src/store/gameStore';
import { useTutorialStore } from '../../src/store/tutorialStore';
import { createInitialGame } from '../../src/game/engine/initialState';
import { readyGame } from '../fixtures/game';

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('PointerEvent', class extends MouseEvent { pointerId = 1; isPrimary = true; });
  useGameStore.setState({ ...createInitialGame(), phase: 'gardenSetup' });
  useTutorialStore.getState().start();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); useTutorialStore.getState().skip(); });

it('teaches each resource, reviews Back, collapses and finishes without changing game state', async () => {
  const user = userEvent.setup();
  render(<><GardenBuilder /><Tutorial /></>);
  const before = JSON.stringify(useGameStore.getState());
  await user.click(screen.getByRole('button', { name: 'Next' }));
  for (const resource of ['pollen', 'nectar', 'water'] as const) {
    expect(screen.getByLabelText('Guided tutorial').textContent).toContain(RESOURCE_DESCRIPTIONS[resource]);
    expect(document.querySelector(`[data-garden-resource="${resource}"]`)?.classList.contains('tutorial-resource-focus')).toBe(true);
    expect(RESOURCE_DESCRIPTIONS[resource].split(/[.!?]/).filter(Boolean)).toHaveLength(1);
    if (resource === 'nectar') {
      await user.click(screen.getByRole('button', { name: 'Back' }));
      expect(document.querySelector('[data-garden-resource="pollen"]')?.classList.contains('tutorial-resource-focus')).toBe(true);
      await user.click(screen.getByRole('button', { name: 'Next' }));
    }
    await user.click(screen.getByRole('button', { name: 'Next' }));
  }
  await user.click(screen.getByRole('button', { name: 'Minimise guide' }));
  expect(screen.queryByRole('button', { name: 'Got it' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Show garden guide' }));
  await user.click(screen.getByRole('button', { name: 'Got it' }));
  expect(screen.queryByLabelText('Guided tutorial')).toBeNull();
  expect(JSON.stringify(useGameStore.getState())).toBe(before);
  expect(document.activeElement).toBe(document.querySelector('[data-garden-resource="pollen"]'));
});

it('reuses the exact same short descriptions in later-game information', async () => {
  const user = userEvent.setup();
  useGameStore.setState(readyGame());
  render(<InventoryToolbar />);
  for (const resource of ['pollen', 'nectar', 'water'] as const) {
    await user.click(screen.getByLabelText(`About ${resource[0].toUpperCase() + resource.slice(1)}`));
    expect(screen.getByText(RESOURCE_DESCRIPTIONS[resource])).toBeTruthy();
  }
});

function TestTargets() {
  const { register } = useGardenDrag();
  useEffect(() => register(x => x < 0 ? null : x < 200 ? { q: 0, r: 0 } : { q: 3, r: 0 }), [register]);
  return null;
}
it('uses validated placement once and rejects occupied, disconnected, cancelled and outside drops', () => {
  render(<GardenDragProvider enabled><TestTargets /><GardenBuilder /></GardenDragProvider>);
  const button = screen.getByRole('button', { name: /^Nectar/ });
  const start = () => { fireEvent.pointerDown(button, { clientX: 400, clientY: 300, button: 0 }); fireEvent.pointerMove(window, { clientX: 100, clientY: 300 }); };
  start(); fireEvent.pointerUp(window, { clientX: 100, clientY: 300 });
  expect(useGameStore.getState().tiles).toHaveLength(1);
  expect(useGameStore.getState().tiles[0].resource).toBe('nectar');
  fireEvent.pointerUp(window, { clientX: 100, clientY: 300 }); // Duplicate release.
  for (const x of [100, 300, -10]) { start(); fireEvent.pointerUp(window, { clientX: x, clientY: 300 }); }
  start(); fireEvent.pointerCancel(window);
  expect(useGameStore.getState().tiles).toHaveLength(1);
  expect(useGameStore.getState().selectedResource).toBe('nectar');
  expect(useGameStore.getState().inventory).toEqual(createInitialGame().inventory);
  expect(document.querySelector('.garden-drag-preview')).toBeNull();
  act(() => useGameStore.getState().removeLastGardenTile());
  expect(useGameStore.getState().tiles).toHaveLength(0);
});
