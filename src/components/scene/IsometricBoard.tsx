import { SceneMotion } from './SceneMotion';
import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { BoardCamera } from './BoardCamera';
import { STARTING_TILE_COUNT } from '../../game/config/gameSettings';
import { hexKey } from '../../game/board/hexCoordinates';
import { isGardenPlacementLegal } from '../../game/board/legalPlacement';
import type { CharacterType, GamePhase, GardenTile, HexCoord, Hive as HiveState, ResourceType } from '../../game/types';
import { Bee } from './Bee';
import { Beekeeper } from './Beekeeper';
import { HexTile, hexPosition } from './HexTile';
import { Hive } from './Hive';
import { Html } from '@react-three/drei';
import { useTutorialStore } from '../../store/tutorialStore';
import { PlacementPreview } from './PlacementPreview';

interface IsometricBoardProps {
  phase: GamePhase;
  tiles: GardenTile[];
  hives: HiveState[];
  beeTileId: string | null;
  beekeeperTileId: string | null;
  activeCharacter: CharacterType;
  selectedResource: ResourceType;
  onGardenTile: (q: number, r: number) => void;
  onHiveTile: (tileId: string) => void;
  onCharacterTile: (character: CharacterType, tileId: string) => void;
  gameSelectableTileIds?: string[];
  placementCoords?: HexCoord[];
  selectedTileId?: string | null;
  onGameTile?: (tileId: string | null, coord: HexCoord) => void;
}

const BOARD_RADIUS = 3;
const boardCoords: HexCoord[] = [];
for (let q = -BOARD_RADIUS; q <= BOARD_RADIUS; q += 1) {
  for (let r = -BOARD_RADIUS; r <= BOARD_RADIUS; r += 1) {
    if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= BOARD_RADIUS) {
      boardCoords.push({ q, r });
    }
  }
}

export function IsometricBoard({
  phase,
  tiles,
  hives,
  beeTileId,
  beekeeperTileId,
  activeCharacter,
  selectedResource,
  onGardenTile,
  onHiveTile,
  onCharacterTile,
  gameSelectableTileIds = [],
  placementCoords = [],
  selectedTileId = null,
  onGameTile,
}: IsometricBoardProps) {
  const [resetRequest, setResetRequest] = useState(0);
  const guided = useTutorialStore(state => state.active);
  const tileIds = new Set(tiles.map((tile) => tile.id));
  const gardenSlotsAvailable = tiles.length < STARTING_TILE_COUNT;
  const gameCoordMap = new Map(
    [...tiles, ...placementCoords.map((coord) => ({ ...coord, id: hexKey(coord), resource: 'pollen' as ResourceType }))]
      .map((coord) => [hexKey(coord), coord]),
  );
  const visibleCoords: HexCoord[] =
    phase === 'gardenSetup' ? boardCoords : [...gameCoordMap.values()];
  const recommended = guided ? phase === 'gardenSetup' && gardenSlotsAvailable
    ? [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 1, r: 1 }, { q: 0, r: 1 }, { q: -1, r: 1 }, ...visibleCoords].find(coord => isGardenPlacementLegal(coord, tiles))
    : phase === 'hiveSetup' ? tiles.find(tile => !tile.damaged && !hives.some(hive => hive.tileId === tile.id))
    : phase === 'characterSetup' && !(beeTileId && beekeeperTileId) ? tiles[0]
    : phase === 'ready' ? placementCoords[0] ?? tiles.find(tile => gameSelectableTileIds.includes(tile.id)) : undefined : undefined;
  function selectTile(coord: HexCoord) {
    const tile = tiles.find((item) => hexKey(item) === hexKey(coord));
    if (phase === 'ready') {
      onGameTile?.(tile?.id ?? null, coord);
    } else if (phase === 'gardenSetup' && gardenSlotsAvailable && isGardenPlacementLegal(coord, tiles)) {
      onGardenTile(coord.q, coord.r);
    } else if (tile && phase === 'hiveSetup') {
      onHiveTile(tile.id);
    } else if (tile && phase === 'characterSetup') {
      onCharacterTile(activeCharacter, tile.id);
    }
  }

  return (
    <div
      className={phase === 'ready' ? 'board-canvas game-board-canvas' : 'board-canvas'}
      aria-label="Interactive isometric garden board"
    >
      <Canvas frameloop="demand" shadows dpr={[1, 1.5]} gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={['#F9F6E7']} />
        <BoardCamera coords={phase === 'gardenSetup' ? boardCoords : tiles} phase={phase} resetRequest={resetRequest} />
        <ambientLight intensity={1.35} />
        <directionalLight position={[5, 10, 6]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
        <group position={[0, -0.38, 0]}>
          {visibleCoords.map((coord) => {
            const tile = tiles.find((item) => hexKey(item) === hexKey(coord));
            const isValidGardenSlot =
              phase === 'gardenSetup' &&
              gardenSlotsAvailable &&
              isGardenPlacementLegal(coord, tiles);
            const isValidHiveSlot =
              phase === 'hiveSetup' && Boolean(tile) && !hives.some((hive) => hive.tileId === tile?.id);
            const isCharacterSlot = phase === 'characterSetup' && Boolean(tile);
            const isGameDestination = Boolean(tile && gameSelectableTileIds.includes(tile.id));
            const isGamePlacement = phase === 'ready' && placementCoords.some((item) => hexKey(item) === hexKey(coord));
            const selectable = phase === 'ready'
              ? Boolean(tile) || isGamePlacement
              : isValidGardenSlot || isValidHiveSlot || isCharacterSlot;
            const highlighted =
              isValidGardenSlot ||
              (Boolean(tile) && phase === 'hiveSetup' && !hives.some((hive) => hive.tileId === tile?.id)) ||
              (Boolean(tile) && phase === 'characterSetup') ||
              isGameDestination ||
              isGamePlacement ||
              (phase === 'ready' && tile?.id === selectedTileId);

            return (
              <HexTile
                key={hexKey(coord)}
                coord={coord}
                tile={tile}
                selectable={selectable}
                highlighted={highlighted}
                preview={Boolean(recommended && hexKey(recommended) === hexKey(coord) && !tile)}
                selectedResource={selectedResource}
                onSelect={selectTile}
                damaged={Boolean(tile?.damaged)}
                wildlifeReserve={Boolean(tile?.wildlifeReserve)}
                noSprayZone={Boolean(tile?.noSprayZone)}
              />
            );
          })}
          {recommended && (() => {
            const { x, z } = hexPosition(recommended);
            return <group position={[x, 0.22, z]}>
              <mesh rotation={[-Math.PI / 2, 0, Math.PI / 6]} raycast={() => null}><ringGeometry args={[0.96, 1.06, 6]} /><meshBasicMaterial color="#FFCD1F" /></mesh>
              {(phase === 'hiveSetup' || phase === 'characterSetup') && <Suspense fallback={null}><PlacementPreview kind={phase === 'hiveSetup' ? 'hive' : activeCharacter} /></Suspense>}
              <Html position={[0, 1.1, 0]} center zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}><span className="placement-ghost" aria-hidden="true">{phase === 'hiveSetup' ? '⌂ Hive here?' : phase === 'characterSetup' ? activeCharacter === 'bee' ? '🐝 Bee here?' : '🧑‍🌾 Beekeeper here?' : '↓ Try this hex'}</span></Html>
            </group>;
          })()}
          <SceneMotion active={Boolean(beeTileId || beekeeperTileId)}>
            <Suspense fallback={null}>
              {tiles.map((tile) => {
                const { x, z } = hexPosition(tile);
                const hive = hives.find((item) => item.tileId === tile.id);
                return tileIds.has(tile.id) && hive ? (
                  <Hive key={hive.id} position={[x, 0.12, z - 0.12]} damaged={hive.damaged} smartHive={hive.smartHive} onSelect={() => selectTile(tile)} />
                ) : null;
              })}
              {beeTileId && (() => {
                const tile = tiles.find((item) => item.id === beeTileId);
                if (!tile) return null;
                const { x, z } = hexPosition(tile);
                return <Bee key="bee" position={[x - 0.43, 0.22, z + 0.25]} onSelect={() => selectTile(tile)} />;
              })()}
              {beekeeperTileId && (() => {
                const tile = tiles.find((item) => item.id === beekeeperTileId);
                if (!tile) return null;
                const { x, z } = hexPosition(tile);
                return <Beekeeper key="beekeeper" position={[x + 0.43, 0.12, z + 0.3]} onSelect={() => selectTile(tile)} />;
              })()}
            </Suspense>
          </SceneMotion>
        </group>
      </Canvas>
      {phase === 'ready' && (
        <button type="button" className="reset-view-button" onClick={() => setResetRequest(value => value + 1)}>
          <span aria-hidden="true">⌖</span> Reset view
        </button>
      )}
    </div>
  );
}
