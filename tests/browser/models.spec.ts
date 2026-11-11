import { expect, test, type Page } from '@playwright/test';
import { readyGame } from '../fixtures/game';
import { encodeSave, SAVE_KEY } from '../../src/game/persistence/saveGame';
import { hexDistance } from '../../src/game/board/hexCoordinates';
import { legalGardenPositions, rollAndResolveEvent, selectAction } from '../../src/game/engine/gameEngine';

/** Inspect the live Fiber scene from tests, without adding a production debugging API. */
async function sceneReport(page: Page) {
  return page.evaluate(async () => {
    const fiberPath = '/node_modules/.vite/deps/@react-three_fiber.js';
    const { _roots } = await import(/* @vite-ignore */ fiberPath);
    const canvas = document.querySelector('canvas');
    const root = _roots.get(canvas);
    if (!root) return null;
    const { scene, camera, gl } = root.store.getState();
    scene.updateMatrixWorld(true);
    const bounds = canvas!.getBoundingClientRect();
    const pieces: any[] = [];
    scene.traverse((object: any) => { if (object.name.startsWith('piece-')) pieces.push(object); });
    const reports = pieces.map(piece => {
      const meshes: any[] = [];
      piece.traverse((object: any) => { if (object.isMesh && object.geometry.getAttribute('color')) meshes.push(object); });
      const point = piece.getWorldPosition(piece.position.clone());
      point.y += piece.name === 'piece-beekeeper' ? 0.4 : piece.name === 'piece-bee' ? 0.22 : 0.25;
      point.project(camera);
      return {
        kind: piece.name, uuid: piece.uuid, meshes: meshes.length,
        geometry: meshes[0]?.geometry.uuid, material: meshes[0]?.material.uuid,
        vertexColours: meshes.length > 0 && meshes.every(mesh => mesh.material.vertexColors),
        diffuseDefaults: meshes.length > 0 && meshes.every(mesh => mesh.material.metalness === 0),
        shadows: meshes.length > 0 && meshes.every(mesh => mesh.castShadow && mesh.receiveShadow),
        triangles: meshes.reduce((sum, mesh) => sum + (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3, 0),
        x: bounds.left + (point.x + 1) * bounds.width / 2,
        y: bounds.top + (1 - point.y) * bounds.height / 2,
        idleY: piece.children[0]?.position.y, idleZ: piece.children[0]?.rotation.z,
      };
    });
    return {
      pieces: reports,
      damaged: scene.getObjectsByProperty('name', 'hive-damaged-indicator').length,
      smart: scene.getObjectsByProperty('name', 'hive-smart-indicator').length,
      drawCalls: gl.info.render.calls, renderedTriangles: gl.info.render.triangles, frame: gl.info.render.frame,
      geometries: gl.info.memory.geometries,
    };
  });
}

test('lightweight models preserve colours, shadows, and mouse/touch piece picking', async ({ page }, testInfo) => {
  const errors: string[] = [], requested: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().endsWith('.glb')) requested.push(request.url()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const state = selectAction(rollAndResolveEvent(readyGame(), () => 0.01), 'bee');
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, save), { key: SAVE_KEY, save: encodeSave(state) });
  await page.goto('/'); await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect.poll(async () => (await sceneReport(page))?.pieces.length).toBe(6);
  await page.getByRole('button', { name: 'Reset view' }).click();
  const report = (await sceneReport(page))!;
  expect(report.pieces.every(piece => piece.vertexColours && piece.diffuseDefaults && piece.shadows)).toBe(true);
  expect(requested).toHaveLength(3);
  expect(requested.every(url => !url.includes('_detailed'))).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('models-normal.png') });
  const tap = async (point: { x: number; y: number }) => {
    if (testInfo.project.name.startsWith('tablet')) await page.touchscreen.tap(point.x, point.y);
    else await page.mouse.click(point.x, point.y);
  };
  // Hit the GLB itself, not a coordinate button or an empty part of its hex.
  await tap(report.pieces.filter(piece => piece.kind === 'piece-hive')[1]);
  await expect.poll(async () => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).snapshot.beeTileId, SAVE_KEY)).toBe('tile-1-0');
  await expect(page.getByLabel('Nectar: 2', { exact: true })).toBeVisible();
  for (const [kind, tile] of [['piece-bee', 'tile-1-0'], ['piece-beekeeper', 'tile-0-0']]) {
    const point = (await sceneReport(page))!.pieces.find(piece => piece.kind === kind)!;
    await tap(point);
    await expect.poll(async () => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).snapshot.selectedTileId, SAVE_KEY)).toBe(tile);
  }
  expect(errors).toEqual([]);
});

test('18 tiles and 15 hives share assets and retain simultaneous status indicators', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const state = readyGame();
  for (const resource of ['pollen', 'nectar', 'water'] as const) {
    while (state.tiles.filter(t => t.resource === resource).length < 6) {
      const coord = legalGardenPositions(state.tiles).sort((a, b) => hexDistance(a, { q: 0, r: 0 }) - hexDistance(b, { q: 0, r: 0 }))[0];
      state.tiles.push({ ...coord, id: `stress-${state.tiles.length}`, resource });
    }
  }
  state.hives = state.tiles.slice(0, 15).map((tile, i) => ({ id: `hive-${i}`, tileId: tile.id, damaged: i < 3, smartHive: i < 3 }));
  state.tiles = state.tiles.map((tile, i) => ({ ...tile, wildlifeReserve: i < 3, noSprayZone: i < 3 }));
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, save), { key: SAVE_KEY, save: encodeSave(state) });
  await page.goto('/'); await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect.poll(async () => (await sceneReport(page))?.pieces.length).toBe(17);
  await page.getByRole('button', { name: 'Reset view' }).click();
  const report = (await sceneReport(page))!;
  const hives = report.pieces.filter(piece => piece.kind === 'piece-hive');
  expect(hives).toHaveLength(15);
  expect(new Set(hives.map(h => h.uuid)).size).toBe(15);
  expect(new Set(hives.map(h => h.geometry)).size).toBe(1);
  expect(new Set(hives.map(h => h.material)).size).toBe(1);
  expect(report.pieces.every(piece => piece.vertexColours && piece.diffuseDefaults && piece.shadows)).toBe(true);
  expect(report.pieces.reduce((sum, piece) => sum + piece.triangles, 0)).toBeLessThan(200000);
  expect(report.damaged).toBe(3); expect(report.smart).toBe(3);
  await testInfo.attach('renderer-counts', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
  await page.screenshot({ path: testInfo.outputPath('models-15-hives.png') });
  expect(errors).toEqual([]);
});

test('idle animation responds to reduced motion and returns to demand rendering', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, save), { key: SAVE_KEY, save: encodeSave(readyGame()) });
  await page.goto('/'); await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect.poll(async () => (await sceneReport(page))?.pieces.find(p => p.kind === 'piece-bee')?.idleY ?? 0).toBeGreaterThan(0.005);
  const before = (await sceneReport(page))!.frame;
  await expect.poll(async () => (await sceneReport(page))!.frame).toBeGreaterThan(before);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(async () => (await sceneReport(page))?.pieces.find(p => p.kind === 'piece-bee')?.idleY).toBe(0);
  await expect.poll(async () => (await sceneReport(page))?.pieces.find(p => p.kind === 'piece-beekeeper')?.idleZ).toBe(0);
  // Allow already-requested frames to drain before sampling the idle renderer.
  await page.waitForTimeout(250);
  const stopped = (await sceneReport(page))!.frame;
  await page.waitForTimeout(250);
  expect((await sceneReport(page))!.frame).toBe(stopped);
});
