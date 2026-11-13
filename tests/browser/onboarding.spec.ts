import { expect, test } from '@playwright/test';
import { garden } from '../fixtures/game';

test('welcome, guided placement and first round work on desktop and touch layouts', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { Math.random = () => 0.01; });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'How to Win' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How You Can Lose' })).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  expect(await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('16px Figtree'); })).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('welcome.png'), fullPage: true });
  if (testInfo.project.name.startsWith('tablet')) await page.getByRole('button', { name: 'Start Game' }).tap();
  else await page.getByRole('button', { name: 'Start Game' }).click();
  await page.getByRole('textbox', { name: 'Player 1 name' }).fill('Ari');
  await page.getByRole('textbox', { name: 'Player 2 name' }).fill('Sam');
  await page.getByRole('button', { name: 'Choose your garden' }).click();
  await expect(page.getByText('↓ Try this hex')).toBeVisible();
  await page.getByText('Keyboard-accessible placement').click();
  await page.screenshot({ path: testInfo.outputPath('guided-garden.png'), fullPage: true });
  // Hit the recommended hex itself while the tutorial is open, including touch.
  // This verifies that the spotlight and translucent preview cannot eat a gesture.
  await page.locator('.board-canvas canvas').scrollIntoViewIfNeeded();
  const firstHex = await page.evaluate(async () => {
    const fiberPath = '/node_modules/.vite/deps/@react-three_fiber.js';
    const { _roots } = await import(/* @vite-ignore */ fiberPath);
    const canvas = document.querySelector('canvas')!;
    const { camera } = _roots.get(canvas).store.getState();
    const point = camera.position.clone().set(0, -0.38, 0).project(camera);
    const bounds = canvas.getBoundingClientRect();
    return { x: bounds.left + (point.x + 1) * bounds.width / 2, y: bounds.top + (1 - point.y) * bounds.height / 2 };
  });
  if (testInfo.project.name.startsWith('tablet')) await page.touchscreen.tap(firstHex.x, firstHex.y);
  else await page.mouse.click(firstHex.x, firstHex.y);
  await expect(page.getByText('1 of 5', { exact: true })).toBeVisible();
  for (const tile of garden.slice(1)) {
    await page.getByRole('button', { name: new RegExp(`^${tile.resource}`, 'i') }).click();
    await page.getByRole('button', { name: `Place at ${tile.q}, ${tile.r}`, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Place the hives' }).click();
  await expect(page.getByText('1 of 4', { exact: true })).toBeVisible();
  await expect(page.getByText(/We placed one hive as an example/)).toBeVisible();
  await page.getByText('Keyboard-accessible placement').click();
  for (const tile of garden.slice(1, 4)) await page.getByRole('button', { name: `Place hive at ${tile.q}, ${tile.r}`, exact: true }).click();
  await page.getByText('Keyboard-accessible placement').click();
  await page.getByRole('button', { name: 'Place bee at 0, 0', exact: true }).click();
  await page.getByRole('button', { name: 'Place beekeeper at 0, 0', exact: true }).click();
  await page.getByRole('button', { name: 'Start First Round' }).click();
  await page.getByRole('button', { name: 'Roll Dice' }).click();
  await expect(page.getByRole('heading', { name: 'Varroa mite!', exact: true })).toBeVisible();
  await expect(page.locator('.dice-event-notice')).toHaveCount(0, { timeout: 6000 });
  await page.getByRole('button', { name: 'Bee', exact: true }).click();
  await page.getByRole('button', { name: /Move bee to Nectar at 1, 0/ }).click();
  await expect(page.getByRole('heading', { name: 'Collected: +2 nectar' })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Beekeeper', exact: true }).click();
  await page.getByRole('button', { name: /Move beekeeper to Pollen at 0, 0/ }).click();
  await page.getByRole('button', { name: 'Repair hive', exact: true }).click();
  await page.getByRole('button', { name: 'Finish trading & turn' }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Roll Dice' }).click();
  await expect(page.getByRole('heading', { name: 'Varroa mite!', exact: true })).toBeVisible();
  await expect(page.locator('.dice-event-notice')).toHaveCount(0, { timeout: 6000 });
  for (const category of ['Bee', 'Garden']) {
    await page.getByRole('button', { name: category, exact: true }).click();
    await page.getByRole('button', { name: 'Skip this action' }).click();
  }
  await page.getByRole('button', { name: 'Finish trading & turn' }).click();
  await expect(page.getByRole('heading', { name: 'Your first round is complete!' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue Playing' }).click();
  await expect(page.getByLabel('Guided tutorial')).toHaveCount(0);
  await page.getByText('Help & Instructions', { exact: true }).click();
  await page.getByRole('button', { name: 'Restart guided tutorial here' }).click();
  await expect(page.getByLabel('Guided tutorial')).toBeVisible();
  await page.getByRole('button', { name: 'Skip Tutorial' }).click();
  await page.getByRole('button', { name: 'Reset view' }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('ready-board.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
