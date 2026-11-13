import { expect, test, type Page } from '@playwright/test';
import { readyGame } from '../fixtures/game';
import { encodeSave, SAVE_KEY } from '../../src/game/persistence/saveGame';
import { DIE_FACES } from '../../src/components/scene/diceOrientation';
import { DIE_EVENTS } from '../../src/game/config/dice';

// Capture the brief landing in the browser's frame loop, rather than racing
// successive automation requests against a disappearing canvas.
async function watchLanding(page: Page) {
  await page.evaluate(async () => {
    const fiberPath = '/node_modules/.vite/deps/@react-three_fiber.js';
    const { _roots } = await import(/* @vite-ignore */ fiberPath);
    const probe = window as typeof window & { diceTestLanding: unknown };
    probe.diceTestLanding = null;
    const deadline = performance.now() + 15000;
    const trail: Array<{ x: number; quaternion: string }> = [];
    const sample = () => {
      const canvas = document.querySelector('.dice-stage canvas');
      const root = _roots.get(canvas);
      const scene = root?.store.getState().scene;
      const die = scene?.getObjectByName('environment-die');
      const label = document.querySelector('.dice-landing-label');
      if (die) {
        trail.push({ x: die.position.x, quaternion: die.quaternion.toArray().join(',') });
        if (label && getComputedStyle(label).opacity === '1') {
          const meshes: any[] = [];
          die.traverse((object: any) => { if (object.isMesh) meshes.push(object); });
          const surface = document.querySelector('.dice-stage')!.getBoundingClientRect();
          const board = document.querySelector('.game-board-canvas')!.getBoundingClientRect();
          probe.diceTestLanding = {
            quaternion: die.quaternion.toArray(), meshes: meshes.length, trail,
            authored: meshes.every(mesh => mesh.material.clearcoat === 0.92 && mesh.material.roughness === 0.19 && mesh.material.metalness === 0.055 && mesh.material.map?.image.width === 2560),
            text: label.textContent,
            alignment: Math.max(Math.abs(surface.left - board.left), Math.abs(surface.width - board.width)),
            width: surface.width,
            beforeResult: JSON.parse(localStorage.getItem('a-game-of-hives.save')!).snapshot.dieResult,
          };
          return;
        }
      }
      if (performance.now() < deadline) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

async function landingReport(page: Page): Promise<any> {
  await expect.poll(() => page.evaluate(() => (window as any).diceTestLanding), { timeout: 15000 }).not.toBeNull();
  return page.evaluate(() => (window as any).diceTestLanding);
}

test('all six settled faces, their embedded artwork and temporary feedback match actual effects', async ({ page }, testInfo) => {
  test.setTimeout(100000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { Math.random = () => Number(localStorage.getItem('test.die-rng') ?? '0.01'); });
  await page.goto('/');
  for (let face = 1; face <= 6; face++) {
    const snapshot = readyGame();
    if (face === 1) snapshot.hives[0].smartHive = true; // The message must report protection.
    await page.evaluate(({ key, save, face }) => {
      localStorage.setItem(key, save);
      localStorage.setItem('test.die-rng', String((face - 0.9) / 6));
    }, { key: SAVE_KEY, save: encodeSave(snapshot), face });
    await page.reload();
    await page.getByRole('button', { name: 'Resume saved game' }).click();
    await expect(page.locator('.dice-stage')).toHaveCount(0);
    expect((await page.locator('.dice-panel').boundingBox())!.height).toBeLessThan(150);
    const button = page.getByRole('button', { name: 'Roll Dice', exact: true });
    await watchLanding(page);
    if (testInfo.project.name.startsWith('tablet')) await button.tap();
    else { await button.focus(); await page.keyboard.press('Enter'); }
    const landed = await landingReport(page);
    expect(landed.meshes).toBe(7);
    expect(landed.authored).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`die-face-${face}.png`) });
    const notice = page.locator('.dice-event-notice');
    await expect(notice).toBeVisible();
    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).snapshot, SAVE_KEY);
    expect(stored.currentEvent).toBe(DIE_EVENTS[face - 1]);
    expect(stored.dieResult).toBe(face);
    await expect(notice).toContainText(stored.message);
    if (face === 1) { expect(stored.hives[0].damaged).toBe(false); await expect(notice).toContainText('protected'); }
    if (face >= 5) { expect(stored.turnPhase).toBe('eventPlacement'); expect(stored.tiles).toHaveLength(5); }
    if (face === 4) expect(stored.eventRestriction).toBe('noBeeMove');
    const quaternion = landed.quaternion;
    const [x, y, z] = DIE_FACES[face - 1].normal;
    // Rotate the actual outward normal by the rendered quaternion and check it faces the viewer.
    const [qx, qy, qz, qw] = quaternion;
    const ix = qw * x + qy * z - qz * y, iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x, iw = -qx * x - qy * y - qz * z;
    const facingZ = iz * qw - iw * qz - ix * qy + iy * qx;
    expect(facingZ).toBeGreaterThan(0.85);
    const facingY = iy * qw - iw * qy - iz * qx + ix * qz;
    expect(facingY).toBeGreaterThan(0.45);
    const bounds = (await notice.boundingBox())!;
    expect(Math.abs(bounds.x + bounds.width / 2 - page.viewportSize()!.width / 2)).toBeLessThan(2);
    expect(Math.abs(bounds.y + bounds.height / 2 - page.viewportSize()!.height / 2)).toBeLessThan(2);
    await expect(notice).toHaveCount(0, { timeout: 6000 });
    await page.locator('.dice-panel').evaluate(element => element.scrollIntoView({ block: 'center' }));
    await expect(page.locator('.dice-stage')).toHaveCount(0);
    await expect(page.locator('.dice-panel')).toHaveText('Roll DiceRoll Dice');
    await expect(page.locator('.event-card')).toHaveCount(0);
    await expect(page.locator('.message-line')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('a real tumble finishes before applying one effect and rejects repeated presses', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(({ key, save }) => { localStorage.setItem(key, save); Math.random = () => 0.01; }, { key: SAVE_KEY, save: encodeSave(readyGame()) });
  await page.goto('/'); await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.locator('.dice-stage')).toHaveCount(0);
  const button = page.getByRole('button', { name: 'Roll Dice', exact: true });
  await watchLanding(page);
  if (testInfo.project.name.startsWith('tablet')) await button.tap(); else await button.click();
  await expect(button).toBeDisabled();
  await expect(page.locator('.dice-stage')).toHaveClass(/dice-stage-rolling/);
  await button.evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  const before = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).snapshot, SAVE_KEY);
  expect(before.dieResult).toBeNull(); expect(before.hives[0].damaged).toBe(false);
  const landed = await landingReport(page);
  expect(landed.width).toBeGreaterThan(300);
  expect(landed.alignment).toBeLessThan(2);
  expect(landed.beforeResult).toBeNull();
  expect(landed.text).toBe('Landed: Varroa mite');
  expect(new Set(landed.trail.map((point: any) => point.quaternion)).size).toBeGreaterThan(3);
  const xs = landed.trail.map((point: any) => point.x);
  expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.2);
  await page.screenshot({ path: testInfo.outputPath('landed-face.png') });
  await expect(page.locator('.dice-event-notice')).toContainText('damaged a hive');
  await expect(page.locator('.dice-stage')).toHaveCount(0);
  const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).snapshot, SAVE_KEY);
  expect(after.hives).toHaveLength(4);
  expect(after.hives.filter((h: { damaged: boolean }) => h.damaged)).toHaveLength(1);
  await expect(page.locator('.dice-event-notice')).toHaveCount(0, { timeout: 6000 });
});
