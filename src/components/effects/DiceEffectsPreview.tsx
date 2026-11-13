import { Suspense, lazy, useRef, useState } from 'react';
import { DiceEffectsManager } from './DiceEffectsManager';
import { EFFECT_DURATIONS, EFFECT_LABELS, type DiceEffect, type DiceEffectType } from './types';

const Board = lazy(() => import('../scene/IsometricBoard').then(module => ({ default: module.IsometricBoard })));
const tiles = [
  { id: 'preview-0', q: 0, r: 0, resource: 'pollen' as const }, { id: 'preview-1', q: 1, r: 0, resource: 'nectar' as const },
  { id: 'preview-2', q: 2, r: 0, resource: 'water' as const }, { id: 'preview-3', q: 0, r: 1, resource: 'pollen' as const }, { id: 'preview-4', q: 1, r: 1, resource: 'nectar' as const },
];
const hives = tiles.slice(0, 4).map((tile, i) => ({ id: `preview-hive-${i}`, tileId: tile.id, damaged: i === 0, smartHive: false }));
const noop = () => {};

/** Development-only route: does not read/write the game store or saved board. */
export default function DiceEffectsPreview() {
  const sequence = useRef(0);
  const [effect, setEffect] = useState<DiceEffect | null>(null);
  return <DiceEffectsManager effect={effect} onComplete={() => setEffect(null)}>
    <main className="effects-preview">
      <h1>Dice effects preview</h1>
      <p>Play any effect independently. Your saved game, dice results and resources are unchanged.</p>
      <div className="effects-preview-controls">
        {(Object.keys(EFFECT_LABELS) as DiceEffectType[]).map(type => <button type="button" className="secondary-button" key={type} onClick={() => setEffect({ id: ++sequence.current, type, startedAt: performance.now(), duration: EFFECT_DURATIONS[type], targets: [{ q: 0, r: 0 }], positive: true })}>{EFFECT_LABELS[type]}</button>)}
        <button type="button" className="secondary-button" onClick={() => setEffect(null)}>Stop effect</button>
      </div>
      <p role="status">{effect ? `Playing: ${EFFECT_LABELS[effect.type]}` : 'Choose an effect to preview.'}</p>
      <Suspense fallback={<p>Preparing preview garden…</p>}><Board phase="ready" tiles={tiles} hives={hives} beeTileId="preview-0" beekeeperTileId="preview-3" activeCharacter="bee" selectedResource="pollen" onGardenTile={noop} onHiveTile={noop} onCharacterTile={noop} onGameTile={noop} /></Suspense>
    </main>
  </DiceEffectsManager>;
}
