import { expect, test, type Page } from '@playwright/test';
import { readyGame } from '../fixtures/game';
import { encodeSave, SAVE_KEY } from '../../src/game/persistence/saveGame';
import { RESOURCE_DESCRIPTIONS } from '../../src/components/ui/resourceDescriptions';

async function game(page: Page) {
  return page.evaluate(async () => {
    // Vite may timestamp an imported module after development edits. Inspect the
    // exact URL loaded by the app rather than creating a second store instance.
    const loaded = performance.getEntriesByType('resource').map(entry => entry.name).filter(url => /\/src\/store\/gameStore\.ts(?:\?|$)/.test(url));
    const path = loaded.find(url => url.includes('?t=')) ?? loaded[0] ?? '/src/store/gameStore.ts';
    const { useGameStore } = await import(/* @vite-ignore */ path);
    return JSON.parse(JSON.stringify(useGameStore.getState()));
  });
}
async function setup(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Game', exact: true }).click();
  await page.getByRole('textbox', { name: 'Player 1 name' }).fill('Ari');
  await page.getByRole('textbox', { name: 'Player 2 name' }).fill('Sam');
  await page.getByRole('button', { name: 'Choose your garden' }).click();
  await expect(page.locator('.board-canvas canvas')).toBeVisible({ timeout: 15000 });
}
async function hex(page: Page, q: number, r: number) {
  return page.evaluate(async ({ q, r }) => {
    const path = '/node_modules/.vite/deps/@react-three_fiber.js';
    const { _roots } = await import(/* @vite-ignore */ path);
    const canvas = document.querySelector('canvas')!;
    const { camera } = _roots.get(canvas).store.getState();
    const point = camera.position.clone().set(Math.sqrt(3) * (q + r / 2), -0.26, 1.5 * r).project(camera);
    const box = canvas.getBoundingClientRect();
    return { x: box.left + (point.x + 1) * box.width / 2, y: box.top + (1 - point.y) * box.height / 2 };
  }, { q, r });
}
async function sceneSymbols(page: Page) {
  return page.evaluate(async () => {
    const path = '/node_modules/.vite/deps/@react-three_fiber.js';
    const { _roots } = await import(/* @vite-ignore */ path);
    const root = _roots.get(document.querySelector('canvas'));
    if (!root) return { symbols: [], focused: 0, drop: 0 };
    const { scene } = root.store.getState();
    const symbols: string[] = [];
    scene.traverse((o: any) => { if (o.name.startsWith('resource-symbol-')) symbols.push(o.material.map.image.src); });
    return { symbols, focused: scene.getObjectsByProperty('name', 'garden-resource-example').length, drop: scene.getObjectsByProperty('name', 'garden-drop-target').length };
  });
}

test('garden guide stays outside the board, teaches and highlights each resource without making decisions', async ({ page }) => {
  test.setTimeout(90000);
  for (const width of [1920, 1366, 1024]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 768 });
    await setup(page);
    const guide = page.getByLabel('Guided tutorial');
    const a = (await guide.boundingBox())!, b = (await page.locator('.board-canvas').boundingBox())!;
    expect(a.x >= b.x + b.width || a.x + a.width <= b.x || a.y >= b.y + b.height || a.y + a.height <= b.y).toBe(true);
    const before = await game(page);
    expect(before.tiles).toHaveLength(0);
    for (const resource of ['pollen', 'nectar', 'water'] as const) {
      await guide.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(guide).toContainText(RESOURCE_DESCRIPTIONS[resource]);
      await expect(page.locator(`[data-garden-resource="${resource}"]`)).toHaveClass(/tutorial-resource-focus/);
    }
    await guide.getByRole('button', { name: 'Back' }).click();
    await expect(page.locator('[data-garden-resource="nectar"]')).toHaveClass(/tutorial-resource-focus/);
    await guide.getByRole('button', { name: 'Next', exact: true }).click();
    await guide.getByRole('button', { name: 'Next', exact: true }).click();
    await guide.getByRole('button', { name: 'Minimise guide' }).click();
    await expect(guide.getByRole('button', { name: 'Got it' })).toHaveCount(0);
    await guide.getByRole('button', { name: 'Show garden guide' }).click();
    await guide.getByRole('button', { name: 'Got it' }).click();
    await expect(guide).toHaveCount(0);
    expect(await game(page)).toEqual(before);
    await page.getByText('Keyboard-accessible placement', { exact: true }).click();
    await page.getByRole('button', { name: 'Place at 0, 0', exact: true }).click();
    await page.getByText('Help & Instructions', { exact: true }).click();
    await page.getByRole('button', { name: 'Restart guided tutorial here' }).click();
    await guide.getByRole('button', { name: 'Next', exact: true }).click();
    await expect.poll(async () => (await sceneSymbols(page)).focused).toBe(1);
    await guide.getByRole('button', { name: 'Skip Tutorial' }).click();
    expect((await game(page)).tiles).toHaveLength(1);
  }
});

test('mouse and touch dragging share validated placement, reject invalid/cancelled drops and preserve click and undo', async ({ page }, info) => {
  test.setTimeout(60000);
  await setup(page);
  await page.getByRole('button', { name: 'Skip Tutorial' }).click();
  const original = await game(page);
  const touch = info.project.name.startsWith('tablet');
  const client = touch ? await page.context().newCDPSession(page) : null;
  async function drag(resource: string, target: { q: number; r: number } | 'outside' | 'cancel', legal = false) {
    const source = page.locator(`[data-garden-resource="${resource}"]`);
    await source.scrollIntoViewIfNeeded();
    const box = (await source.boundingBox())!;
    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const end = typeof target === 'object' ? await hex(page, target.q, target.r) : { x: 200, y: 80 };
    if (client) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
      for (let i = 1; i <= 8; i++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (end.x - start.x) * i / 8, y: start.y + (end.y - start.y) * i / 8, id: 1 }] });
    } else {
      await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 8 });
    }
    await expect(page.locator('.garden-drag-preview')).toBeVisible();
    if (legal) await expect.poll(async () => (await sceneSymbols(page)).drop).toBe(1);
    if (client) await client.send('Input.dispatchTouchEvent', { type: target === 'cancel' ? 'touchCancel' : 'touchEnd', touchPoints: [] });
    else { if (target === 'cancel') await page.keyboard.press('Escape'); await page.mouse.up(); }
    await expect(page.locator('.garden-drag-preview')).toHaveCount(0);
  }
  for (const target of ['outside', 'cancel'] as const) {
    await drag('pollen', target);
    expect((await game(page)).tiles).toHaveLength(0);
  }
  // The original click-to-place path still places the first tile.
  await page.locator('[data-garden-resource="pollen"]').click();
  const first = await hex(page, 0, 0);
  if (client) await page.touchscreen.tap(first.x, first.y); else await page.mouse.click(first.x, first.y);
  expect((await game(page)).tiles).toHaveLength(1);
  // The first tile may start anywhere in bounds; only later tiles must connect.
  await drag('nectar', { q: 3, r: 0 });
  expect((await game(page)).tiles).toHaveLength(1);
  await drag('nectar', { q: 1, r: 0 }, true);
  expect((await game(page)).tiles).toHaveLength(2);
  await drag('water', { q: 2, r: 0 }, true);
  expect((await game(page)).tiles).toHaveLength(3);
  await drag('water', { q: 0, r: 0 }); // Occupied: no placement.
  expect((await game(page)).tiles).toHaveLength(3);
  await page.getByRole('button', { name: 'Undo last tile' }).click();
  expect((await game(page)).tiles).toHaveLength(2);
  await page.getByText('Keyboard-accessible placement', { exact: true }).click();
  for (const [resource, q, r] of [['water', 2, 0], ['pollen', 0, 1], ['nectar', 1, 1]] as const) {
    await page.locator(`[data-garden-resource="${resource}"]`).click();
    await page.getByRole('button', { name: `Place at ${q}, ${r}`, exact: true }).focus(); await page.keyboard.press('Enter');
  }
  await expect(page.getByRole('button', { name: 'Place the hives' })).toBeEnabled();
  const final = await game(page);
  expect(final.tiles).toHaveLength(5);
  expect(new Set(final.tiles.map((t: any) => t.resource)).size).toBe(3);
  expect(final.inventory).toEqual(original.inventory);
  await client?.detach();
});

test('larger resource HUD keeps recipes and accessible board data usable at requested viewport sizes', async ({ page }, info) => {
  test.setTimeout(60000);
  const save = encodeSave(readyGame());
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, save), { key: SAVE_KEY, save });
  for (const width of [1920, 1366, 1024, 820]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 768 });
    await page.goto('/'); await page.getByRole('button', { name: 'Resume saved game' }).click();
    await expect.poll(async () => (await sceneSymbols(page)).symbols.length).toBe(5);
    expect((await sceneSymbols(page)).symbols.every(url => /assets\/resource-icons\/(pollen|nectar|water)\.svg$/.test(url))).toBe(true);
    const measured = await page.evaluate(() => ({
      icon: parseFloat(getComputedStyle(document.querySelector('.resource-token-icon')!).width),
      value: parseFloat(getComputedStyle(document.querySelector('.resource-token-copy strong')!).fontSize),
      overflow: document.documentElement.scrollWidth > innerWidth,
      clip: getComputedStyle(document.querySelector('.accessible-board-controls')!).clipPath,
    }));
    expect(measured.icon).toBeCloseTo(29 * 1.25); expect(measured.value).toBeCloseTo(17 * 1.25);
    expect(measured.overflow).toBe(false); expect(measured.clip).toBe('inset(50%)');
    for (const product of ['Honey', 'Bee bread', 'Hives available']) {
      const trigger = page.getByRole('button', { name: new RegExp(`^${product}:`) });
      if (info.project.name.startsWith('tablet')) await trigger.tap(); else await trigger.hover();
      const recipe = page.getByRole('dialog', { name: `${product} recipe` });
      await expect(recipe).toBeVisible();
      await page.waitForTimeout(300); // A touch tap must survive synthetic mouse events.
      await expect(recipe).toBeVisible();
      const bounds = (await recipe.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.getByRole('button', { name: `Close ${product} recipe` }).click();
      await trigger.focus(); await expect(recipe).toBeVisible(); await page.keyboard.press('Escape');
    }
    await page.getByLabel('About Pollen', { exact: true }).focus();
    await expect(page.getByText(RESOURCE_DESCRIPTIONS.pollen)).toBeVisible();
    await page.keyboard.press('Escape');
    const controls = page.getByText('Board controls (keyboard and screen reader)', { exact: true });
    await controls.focus(); await page.keyboard.press('Enter');
    const inspect = page.getByText('Inspect garden tiles', { exact: true });
    await inspect.focus(); await page.keyboard.press('Enter');
    await expect(page.locator('.accessible-board-list')).toContainText('Pollen at 0, 0; healthy tile');
    expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBe(save);
  }
});
