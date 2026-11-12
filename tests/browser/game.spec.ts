import { expect, test } from '@playwright/test';
import { garden, readyGame } from '../fixtures/game';
import { encodeSave, SAVE_KEY } from '../../src/game/persistence/saveGame';
import { beginHivePurchase, moveBeekeeper, rollAndResolveEvent, selectAction, skipAction } from '../../src/game/engine/gameEngine';

test('manual setup is usable through DOM controls and renders the board', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Game', exact: false }).click();
  await page.getByRole('button', { name: 'Skip Tutorial' }).click();
  await page.getByRole('textbox', { name: 'Player 1 name' }).fill('Ari');
  await page.getByRole('textbox', { name: 'Player 2 name' }).fill('Sam');
  await page.getByLabel('Who starts?').selectOption('1');
  await page.getByRole('button', { name: 'Choose your garden' }).click();
  await page.getByText('Keyboard-accessible placement').click();
  for (const tile of garden) {
    await page.getByRole('button', { name: new RegExp(`^${tile.resource}`, 'i') }).click();
    await page.getByRole('button', { name: `Place at ${tile.q}, ${tile.r}`, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Place the hives' }).click();
  await page.getByText('Keyboard-accessible placement').click();
  for (const tile of garden.slice(0, 4)) {
    await page.getByRole('button', { name: `Place hive at ${tile.q}, ${tile.r}`, exact: true }).click();
  }
  await page.getByText('Keyboard-accessible placement').click();
  await page.getByRole('button', { name: 'Place bee at 0, 0', exact: true }).click();
  await page.getByRole('button', { name: 'Place beekeeper at 0, 0', exact: true }).click();
  await page.getByRole('button', { name: 'Start First Round' }).click();
  await expect(page.getByRole('heading', { name: 'Sam’s turn' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Roll the die' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume saved game' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.getByRole('heading', { name: 'Sam’s turn' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('reload preserves the committed beekeeper action and keyboard movement continues', async ({ page }) => {
  let state = rollAndResolveEvent(readyGame(), () => 0.4);
  state = moveBeekeeper(selectAction(state, 'beekeeper'), 'tile-1-0');
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, save), { key: SAVE_KEY, save: encodeSave(state) });
  await page.goto('/');
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.getByText('The destination is locked.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Roll the die' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Create no-spray zone' }).click();
  await page.getByRole('button', { name: 'Bee', exact: true }).click();
  const destination = page.getByRole('button', { name: /Move bee to Water at 2, 0/ });
  await destination.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Finish trading & turn' })).toBeVisible();
  await page.getByRole('button', { name: 'Finish trading & turn' }).click();
  await expect(page.getByRole('heading', { name: 'Ari’s turn' })).toBeVisible();
  await expect(page.getByText(/ROUND 1/)).toBeVisible();
});

test('pending hive placement resumes, cancels for free, and completes through keyboard controls', async ({ page }) => {
  let state = rollAndResolveEvent(readyGame(), () => 0.4);
  state = skipAction(selectAction(state, 'bee')); state = skipAction(selectAction(state, 'garden'));
  state = beginHivePurchase({ ...state, inventory: { ...state.inventory, honey: 2, beeBread: 3 } });
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, save), { key: SAVE_KEY, save: encodeSave(state) });
  await page.goto('/'); await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.getByRole('button', { name: 'Finish trading & turn' })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel placement' }).click();
  await page.getByRole('button', { name: 'Buy a hive', exact: true }).click();
  const target = page.getByRole('button', { name: /Place hive on Nectar at 1, 1/ });
  await target.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Finish trading & turn' })).toBeEnabled();
  await expect(page.getByLabel('Team score: 0 out of 10')).toBeVisible();
});

test('invalid saves explain the problem and allow a fresh start', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{broken'), SAVE_KEY);
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Game', exact: false }).click();
  await expect(page.getByRole('status')).toContainText('saved game could not be read');
  await expect(page.getByRole('textbox', { name: 'Player 1 name' })).toBeVisible();
});

test('a full elongated garden renders and camera gestures preserve game state', async ({ page }, testInfo) => {
  const state = readyGame();
  for (const resource of ['pollen', 'nectar', 'water'] as const) {
    while (state.tiles.filter(t => t.resource === resource).length < 6) {
      const q = state.tiles.length - 2;
      state.tiles.push({ id: `extension-${q}`, q, r: 0, resource });
    }
  }
  const save = encodeSave(state);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, save), { key: SAVE_KEY, save });
  await page.goto('/'); await page.getByRole('button', { name: 'Resume saved game' }).click();
  await page.getByRole('button', { name: 'Reset view' }).click();
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const bounds = (await canvas.boundingBox())!;
  const x = bounds.x + bounds.width * 0.2, y = bounds.y + bounds.height * 0.6;
  await page.mouse.move(x, y); await page.mouse.wheel(0, -180);
  await page.mouse.down(); await page.mouse.move(x + 60, y + 20, { steps: 8 }); await page.mouse.up();
  if (testInfo.project.name.startsWith('tablet')) {
    const client = await page.context().newCDPSession(page);
    await client.send('Input.synthesizePinchGesture', { x, y, scaleFactor: 1.2, gestureSourceType: 'touch' });
    await client.detach();
  }
  await page.getByRole('button', { name: 'Reset view' }).click();
  await page.screenshot({ path: testInfo.outputPath('full-garden.png') });
  const stored = await page.evaluate(key => localStorage.getItem(key), SAVE_KEY);
  expect(stored).toBe(save);
  expect(errors).toEqual([]);
});
