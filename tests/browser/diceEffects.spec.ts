import { expect, test, type Page } from '@playwright/test';
import { readyGame } from '../fixtures/game';
import { encodeSave, SAVE_KEY } from '../../src/game/persistence/saveGame';

async function boardPieces(page: Page) {
  return page.evaluate(async () => {
    const fiberPath = '/node_modules/.vite/deps/@react-three_fiber.js';
    const { _roots } = await import(/* @vite-ignore */ fiberPath);
    const root = _roots.get(document.querySelector('.game-board-canvas canvas'));
    if (!root) return null;
    const { scene } = root.store.getState();
    const positions: Record<string, number[]> = {};
    scene.traverse((object: any) => { if (object.name.startsWith('piece-')) positions[object.uuid] = object.position.toArray(); });
    return positions;
  });
}

test('all effects preview independently, paint transparent overlays and leave the game unchanged', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const save = encodeSave(readyGame());
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, save), { key: SAVE_KEY, save });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?effectsPreview=1');
  await expect(page.locator('.game-board-canvas canvas')).toBeVisible({ timeout: 15000 });
  await expect.poll(async () => Object.keys(await boardPieces(page) ?? {}).length).toBe(6);
  const original = await boardPieces(page);
  for (const [label, effect] of [['Extreme Weather', 'extremeWeather'], ['Varroa Mite', 'varroaMite'], ['Climate Change', 'climateChange'], ['Pesticides', 'pesticides'], ['Improvement', 'improvement']]) {
    const button = page.getByRole('button', { name: label, exact: true });
    if (testInfo.project.name.startsWith('tablet')) await button.tap(); else await button.click();
    const layer = page.locator('.dice-effects-layer');
    await expect(layer).toHaveCount(1); await expect(layer).toHaveAttribute('data-effect', effect);
    await expect(layer).toHaveCSS('pointer-events', 'none');
    await expect.poll(() => page.locator('.dice-effects-layer canvas').evaluate((canvas: HTMLCanvasElement) => {
      const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      let painted = 0; for (let i = 3; i < pixels.length; i += 40) if (pixels[i] > 0) painted++;
      return painted;
    })).toBeGreaterThan(5);
    await page.waitForTimeout(effect === 'pesticides' ? 1900 : 900);
    if (effect === 'climateChange') expect(await boardPieces(page)).toEqual(original);
    await page.getByRole('button', { name: 'Reset view' }).click(); // Overlay never swallows a board control.
    await page.screenshot({ path: testInfo.outputPath(`${effect}.png`), fullPage: true });
    await expect(layer).toHaveCount(0, { timeout: 7000 });
    expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBe(save);
  }
  expect(errors).toEqual([]);
});

test('a committed roll triggers one effect and resuming the saved outcome does not replay it', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ key, save }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, save); Math.random = () => 0.52; }, { key: SAVE_KEY, save: encodeSave(readyGame()) });
  await page.goto('/'); await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.locator('.dice-effects-layer')).toHaveCount(0);
  await page.getByRole('button', { name: 'Roll Dice', exact: true }).click();
  await expect(page.locator('.dice-event-notice')).toBeVisible();
  await expect(page.locator('.dice-effects-layer')).toHaveAttribute('data-effect', 'extremeWeather');
  const snapshot = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).snapshot, SAVE_KEY);
  expect(snapshot.eventRestriction).toBe('noBeeMove'); expect(snapshot.hives).toHaveLength(4);
  await expect(page.locator('.dice-effects-layer')).toHaveCount(0, { timeout: 7000 });
  await page.reload(); await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.locator('.dice-effects-layer')).toHaveCount(0);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).snapshot, SAVE_KEY)).toEqual(snapshot);
});

test('reduced motion uses static cues and replacing/stopping an effect cleans old playback', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?effectsPreview=1');
  await page.getByRole('button', { name: 'Climate Change', exact: true }).click();
  await expect(page.locator('.dice-effect-static')).toHaveText('Climate Change');
  await expect(page.locator('.dice-effects-layer canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'Pesticides', exact: true }).click();
  await expect(page.locator('.dice-effects-layer')).toHaveCount(1);
  await expect(page.locator('.dice-effect-static')).toHaveText('Pesticides');
  await expect(page.locator('.dice-effects-layer')).toHaveCount(0, { timeout: 6500 });
  await page.getByRole('button', { name: 'Improvement', exact: true }).click();
  await page.getByRole('button', { name: 'Stop effect', exact: true }).click();
  await expect(page.locator('.dice-effects-layer')).toHaveCount(0);
});
