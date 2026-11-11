import { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { MapControls, OrthographicCamera } from '@react-three/drei';
import { MOUSE, TOUCH } from 'three';
import type { OrthographicCamera as OrthographicCameraType } from 'three';
import type { MapControls as MapControlsImpl } from 'three-stdlib';
import { hexKey } from '../../game/board/hexCoordinates';
import { isGardenPlacementLegal } from '../../game/board/legalPlacement';
import type { CharacterType, GamePhase, GardenTile, HexCoord, Hive as HiveState, ResourceType } from '../../game/types';
import { Bee } from './Bee';
import { Beekeeper } from './Beekeeper';
import { HexTile, hexPosition } from './HexTile';
import { Hive } from './Hive';

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
const CAMERA_FRAME = 5.2;
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
  const boardRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<OrthographicCameraType>(null);
  const controlsRef = useRef<MapControlsImpl>(null);
  const tileIds = new Set(tiles.map((tile) => tile.id));
  const gardenSlotsAvailable = tiles.length < 5;
  const gameCoordMap = new Map(
    [...tiles, ...placementCoords.map((coord) => ({ ...coord, id: hexKey(coord), resource: 'pollen' as ResourceType }))]
      .map((coord) => [hexKey(coord), coord]),
  );
  const visibleCoords: HexCoord[] =
    phase === 'gardenSetup' ? boardCoords : [...gameCoordMap.values()];
  const tilePositions = tiles.map(hexPosition);
  const tileBounds = tilePositions.reduce(
    (bounds, position) => ({
      minX: Math.min(bounds.minX, position.x),
      maxX: Math.max(bounds.maxX, position.x),
      minZ: Math.min(bounds.minZ, position.z),
      maxZ: Math.max(bounds.maxZ, position.z),
    }),
    { minX: 0, maxX: 0, minZ: 0, maxZ: 0 },
  );
  const boardCenter = {
    x: tiles.length ? (tileBounds.minX + tileBounds.maxX) / 2 : 0,
    z: tiles.length ? (tileBounds.minZ + tileBounds.maxZ) / 2 : 0,
  };
  const frame = phase === 'gardenSetup' ? 8 : CAMERA_FRAME;
  const panelWidth = phase === 'ready' && window.innerWidth > 900
    ? Math.min(350, Math.max(280, window.innerWidth * 0.23))
    : 0;
  const initialPixelScale = boardRef.current
    ? boardRef.current.clientHeight * 1.45 / (2 * CAMERA_FRAME)
    : 100;
  const initialPan = panelWidth / (2 * initialPixelScale);
  const initialTarget = {
    x: boardCenter.x + initialPan * 9 / Math.sqrt(145),
    z: boardCenter.z - initialPan * 8 / Math.sqrt(145),
  };

  useEffect(() => {
    const element = boardRef.current;
    if (!element) return;
    const resizeCamera = () => {
      const camera = cameraRef.current;
      if (!camera) return;
      const { width, height } = element.getBoundingClientRect();
      const aspect = width / Math.max(height, 1);
      camera.left = -frame * aspect;
      camera.right = frame * aspect;
      camera.top = frame;
      camera.bottom = -frame;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resizeCamera);
    observer.observe(element);
    resizeCamera();
    return () => observer.disconnect();
  }, [frame]);

  function resetView() {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const element = boardRef.current;
    if (!camera || !controls || !element || !tiles.length) return;
    const centerX = (tileBounds.minX + tileBounds.maxX) / 2;
    const centerZ = (tileBounds.minZ + tileBounds.maxZ) / 2;
    const currentPanelWidth = phase === 'ready' && window.innerWidth > 900
      ? Math.min(350, Math.max(280, window.innerWidth * 0.23))
      : 0;
    const usableWidth = Math.max(element.clientWidth - currentPanelWidth, element.clientWidth * 0.55);
    const aspect = usableWidth / Math.max(element.clientHeight, 1);
    const width = tileBounds.maxX - tileBounds.minX + 3.2;
    const height = tileBounds.maxZ - tileBounds.minZ + 3.2;
    const fitZoom = Math.min(
      (2 * CAMERA_FRAME) / height,
      (2 * CAMERA_FRAME * aspect) / width,
      2.4,
    );
    const pan = currentPanelWidth / (2 * (element.clientHeight * fitZoom / (2 * CAMERA_FRAME)));
    const targetX = centerX + pan * 9 / Math.sqrt(145);
    const targetZ = centerZ - pan * 8 / Math.sqrt(145);
    camera.position.set(targetX + 8, 10, targetZ + 9);
    camera.zoom = Math.max(0.7, fitZoom);
    camera.updateProjectionMatrix();
    controls.target.set(targetX, 0, targetZ);
    controls.update();
  }

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
      ref={boardRef}
      className={phase === 'ready' ? 'board-canvas game-board-canvas' : 'board-canvas'}
      aria-label="Interactive isometric garden board"
    >
      <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={['#eaf1e4']} />
        <OrthographicCamera
          ref={cameraRef}
          makeDefault
          position={[initialTarget.x + 8, 10, initialTarget.z + 9]}
          left={-frame}
          right={frame}
          top={frame}
          bottom={-frame}
          zoom={phase === 'ready' ? 1.45 : 1}
          near={0.1}
          far={100}
          onUpdate={(camera) => camera.lookAt(initialTarget.x, 0, initialTarget.z)}
        />
        <MapControls
          ref={controlsRef}
          makeDefault
          target={[initialTarget.x, 0, initialTarget.z]}
          enableRotate={false}
          enablePan
          enableZoom
          minZoom={0.7}
          maxZoom={2.8}
          screenSpacePanning
          enableDamping
          dampingFactor={0.12}
          mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
          touches={{ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN }}
          onChange={() => {
            const controls = controlsRef.current;
            const camera = cameraRef.current;
            if (!controls || !camera || !tiles.length) return;
            const halfWidth = (camera.right - camera.left) / (2 * camera.zoom);
            const halfHeight = (camera.top - camera.bottom) / (2 * camera.zoom);
            const targetX = Math.max(
              tileBounds.minX - halfWidth + 1,
              Math.min(tileBounds.maxX + halfWidth - 1, controls.target.x),
            );
            const targetZ = Math.max(
              tileBounds.minZ - halfHeight + 1,
              Math.min(tileBounds.maxZ + halfHeight - 1, controls.target.z),
            );
            if (targetX !== controls.target.x || targetZ !== controls.target.z) {
              controls.target.set(targetX, 0, targetZ);
              controls.update();
            }
          }}
        />
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
                selectedResource={selectedResource}
                onSelect={selectTile}
                damaged={Boolean(tile?.damaged)}
                wildlifeReserve={Boolean(tile?.wildlifeReserve)}
                noSprayZone={Boolean(tile?.noSprayZone)}
              />
            );
          })}
          {tiles.map((tile) => {
            const { x, z } = hexPosition(tile);
            const hive = hives.find((item) => item.tileId === tile.id);
            return tileIds.has(tile.id) && hive ? (
              <Hive key={hive.id} position={[x, 0.16, z]} damaged={hive.damaged} smartHive={hive.smartHive} />
            ) : null;
          })}
          {beeTileId && (() => {
            const tile = tiles.find((item) => item.id === beeTileId);
            if (!tile) return null;
            const { x, z } = hexPosition(tile);
            return <Bee key="bee" position={[x - 0.38, 0.33, z - 0.3]} />;
          })()}
          {beekeeperTileId && (() => {
            const tile = tiles.find((item) => item.id === beekeeperTileId);
            if (!tile) return null;
            const { x, z } = hexPosition(tile);
            return <Beekeeper key="beekeeper" position={[x + 0.38, 0.22, z + 0.3]} />;
          })()}
        </group>
      </Canvas>
      {phase === 'ready' && (
        <button type="button" className="reset-view-button" onClick={resetView}>
          <span aria-hidden="true">⌖</span> Reset view
        </button>
      )}
    </div>
  );
}
