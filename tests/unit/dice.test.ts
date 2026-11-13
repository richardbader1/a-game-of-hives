import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three';
import { DIE_EVENTS } from '../../src/game/config/dice';
import { DIE_FACES, settledDiceRotation, tumbleRotation } from '../../src/components/scene/diceOrientation';
import { tabletopPose } from '../../src/components/scene/diceTabletopMotion';
import { rollAndResolveEvent } from '../../src/game/engine/gameEngine';
import { readyGame } from '../fixtures/game';
import { decodeSave, encodeSave } from '../../src/game/persistence/saveGame';

describe('custom GTAC die', () => {
  it('travels within the table bounds, slows down, bounces and rests on the surface', () => {
    for (const [width, height, die] of [[8, 5, 1], [3, 4, 0.6]]) {
      const poses = Array.from({ length: 101 }, (_, i) => tabletopPose(i / 100, width, height, die));
      expect(poses[0].x).toBeLessThan(0);
      expect(poses[100].x).toBeGreaterThan(0);
      expect(poses.some(pose => pose.bounce > die * 0.2)).toBe(true);
      expect(poses[100].bounce).toBe(0);
      expect(poses[100].y).toBe(poses[100].groundY);
      expect(poses[10].x - poses[0].x).toBeGreaterThan(poses[100].x - poses[90].x);
      for (const [index, pose] of poses.entries()) {
        expect(Math.abs(pose.x) + die * 0.85).toBeLessThan(width / 2);
        expect(pose.y).toBeGreaterThanOrEqual(pose.groundY);
        if (index) expect(pose.x).toBeGreaterThanOrEqual(poses[index - 1].x);
      }
    }
  });
  it('keeps all six faces equally likely and both Improvements identical', () => {
    const counts = [0, 0, 0, 0, 0, 0];
    for (let sample = 0; sample < 600; sample++) {
      const state = rollAndResolveEvent(readyGame(), () => (sample + 0.5) / 600);
      counts[state.dieResult! - 1]++;
      expect(state.currentEvent).toBe(DIE_EVENTS[state.dieResult! - 1]);
    }
    expect(counts).toEqual([100, 100, 100, 100, 100, 100]);
    const a = rollAndResolveEvent(readyGame(), () => 4.5 / 6);
    const b = rollAndResolveEvent(readyGame(), () => 5.5 / 6);
    expect(a.turnPhase).toBe('eventPlacement');
    expect(a.tiles).toEqual(b.tiles);
    expect(a.hives).toEqual(b.hives);
    expect(a.inventory).toEqual(b.inventory);
    expect(a.message).toBe(b.message);
    expect(a.actionCategoriesUsed).toEqual([]);
  });

  it('uses the supplied embedded texture and authored clearcoat without replacement materials', () => {
    const bytes = readFileSync('public/models/a_game_of_hives_dice_gtac_glossy.glb');
    expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    expect(gltf.images[0].bufferView).toBeTypeOf('number');
    expect(gltf.images[0].uri).toBeUndefined();
    expect(gltf.materials[0].pbrMetallicRoughness.baseColorTexture.index).toBe(0);
    expect(gltf.materials[0].extensions.KHR_materials_clearcoat.clearcoatFactor).toBe(0.92);
    for (const [index, face] of DIE_FACES.entries()) {
      const mesh = gltf.meshes.find((m: { name: string }) => m.name === face.mesh);
      const bounds = gltf.accessors[mesh.primitives[0].attributes.POSITION];
      const centre = new Vector3(...bounds.min).add(new Vector3(...bounds.max)).multiplyScalar(0.5);
      expect(centre.normalize().dot(new Vector3(...face.normal))).toBeGreaterThan(0.99);
      const orientation = new Quaternion().setFromEuler(settledDiceRotation(index + 1));
      const landedNormal = new Vector3(...face.normal).applyQuaternion(orientation);
      expect(landedNormal.z).toBeGreaterThan(0.85);
      expect(landedNormal.y).toBeGreaterThan(0.45);
    }
  });

  it.each([1, 2, 3, 4, 5, 6])('ends a multi-turn tumble exactly on face %i', face => {
    const end = settledDiceRotation(face);
    const actual = new Quaternion().setFromEuler(new Euler(...tumbleRotation(new Euler(0.2, 0.3, 0.4), end, 1)));
    expect(actual.angleTo(new Quaternion().setFromEuler(end))).toBeLessThan(0.000001);
    expect(Math.abs(tumbleRotation(new Euler(), end, 0)[0])).toBeGreaterThan(Math.PI * 5);
  });

  it('retains already-resolved legacy weather damage across save/resume', () => {
    const legacy = { ...readyGame(), dieResult: 5, currentEvent: 'extremeWeatherDamage' as const, turnPhase: 'actions' as const };
    legacy.hives = legacy.hives.map((hive, i) => ({ ...hive, damaged: i === 0 }));
    const resumed = decodeSave(encodeSave(legacy)).snapshot!;
    expect(resumed).toEqual(legacy);
    expect(rollAndResolveEvent(resumed, () => 0)).toBe(resumed);
  });
});
