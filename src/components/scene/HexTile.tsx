import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { RESOURCE_PRESENTATION } from '../../game/config/gameSettings';
import { hexKey } from '../../game/board/hexCoordinates';
import type { GardenTile, HexCoord, ResourceType } from '../../game/types';

interface HexTileProps {
  coord: HexCoord;
  tile?: GardenTile;
  highlighted?: boolean;
  selectable?: boolean;
  selectedResource?: ResourceType;
  damaged?: boolean;
  wildlifeReserve?: boolean;
  noSprayZone?: boolean;
  onSelect: (coord: HexCoord) => void;
}

export function HexTile({
  coord,
  tile,
  highlighted = false,
  selectable = false,
  selectedResource = 'pollen',
  damaged = false,
  wildlifeReserve = false,
  noSprayZone = false,
  onSelect,
}: HexTileProps) {
  const position = hexPosition(coord);
  const resource = tile?.resource ?? selectedResource;
  const color = damaged ? '#9a7668' : tile ? RESOURCE_PRESENTATION[resource].color : '#eff2e8';
  const edges = useMemo(() => {
    const cylinder = new THREE.CylinderGeometry(0.94, 0.94, 0.28, 6);
    const geometry = new THREE.EdgesGeometry(cylinder);
    cylinder.dispose();
    return geometry;
  }, []);

  useEffect(() => () => edges.dispose(), [edges]);

  return (
    <group position={[position.x, 0, position.z]}>
      <mesh
        position={[0, -0.02, 0]}
        castShadow
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          if (selectable) onSelect(coord);
        }}
        onPointerOver={(event) => {
          if (selectable) {
            event.stopPropagation();
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <cylinderGeometry args={[0.94, 0.94, 0.28, 6]} />
        <meshStandardMaterial
          color={highlighted && !tile ? '#ffe29a' : color}
          roughness={0.82}
          emissive={highlighted && !tile ? '#f5bc4e' : '#000000'}
          emissiveIntensity={highlighted && !tile ? 0.16 : 0}
          transparent={!tile}
          opacity={tile ? 1 : 0.76}
        />
      </mesh>
      <lineSegments position={[0, 0.125, 0]} geometry={edges}>
        <lineBasicMaterial
          color={highlighted ? '#f1a62e' : tile ? '#fff7dd' : '#cdd5c4'}
          linewidth={highlighted ? 2 : 1}
          transparent
          opacity={tile ? 0.92 : 0.7}
        />
      </lineSegments>
      {tile && highlighted && (
        <mesh position={[0, 0.125, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 6]} raycast={() => null}>
          <ringGeometry args={[0.94, 0.985, 6]} />
          <meshBasicMaterial color="#f1a62e" />
        </mesh>
      )}
      {tile && <group position={[0.1, 0.15, -0.62]} rotation={[-Math.PI / 2, 0, 0]}>
        {resource === 'pollen' ? Array.from({ length: 5 }, (_, i) => (
          <mesh key={i} position={[Math.sin(i * Math.PI * 2 / 5) * 0.12, Math.cos(i * Math.PI * 2 / 5) * 0.12, 0]} raycast={() => null}>
            <circleGeometry args={[0.075, 10]} /><meshBasicMaterial color="#ffffff" />
          </mesh>
        )) : resource === 'nectar' ? (
          <mesh rotation={[0, 0, Math.PI / 4]} raycast={() => null}>
            <planeGeometry args={[0.24, 0.24]} /><meshBasicMaterial color="#ffffff" />
          </mesh>
        ) : [-0.1, 0, 0.1].map(y => (
          <mesh key={y} position={[0, y, 0]} raycast={() => null}>
            <planeGeometry args={[0.32, 0.035]} /><meshBasicMaterial color="#ffffff" />
          </mesh>
        ))}
      </group>}
      {!tile && selectable && (
        <mesh position={[0, 0.15, 0]} raycast={() => null}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshBasicMaterial color="#a9b79e" />
        </mesh>
      )}
      {tile && damaged && (
        <Text
          position={[0, 0.34, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.29}
          color="#8f302a"
          anchorX="center"
          anchorY="middle"
          raycast={() => null}
        >
          !
        </Text>
      )}
      {tile && !damaged && (wildlifeReserve || noSprayZone) && (
        <Text
          position={[0, 0.32, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.11}
          color="#244d37"
          anchorX="center"
          anchorY="middle"
          raycast={() => null}
        >
          {wildlifeReserve && noSprayZone ? 'RESERVE · NO SPRAY' : wildlifeReserve ? 'RESERVE' : 'NO SPRAY'}
        </Text>
      )}
    </group>
  );
}

export function hexPosition(coord: HexCoord): { x: number; z: number } {
  return {
    x: Math.sqrt(3) * (coord.q + coord.r / 2),
    z: 1.5 * coord.r,
  };
}

export function getTileAt(tiles: readonly GardenTile[], coord: HexCoord): GardenTile | undefined {
  return tiles.find((tile) => hexKey(tile) === hexKey(coord));
}
