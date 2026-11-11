import type { Vector3Tuple } from 'three';
import { Text } from '@react-three/drei';

interface HiveProps {
  position: Vector3Tuple;
  damaged?: boolean;
  smartHive?: boolean;
}

export function Hive({ position, damaged = false, smartHive = false }: HiveProps) {
  return (
    <group position={position} scale={0.78}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.31, 0.48, 9]} />
        <meshStandardMaterial color={damaged ? '#8b6555' : '#a96437'} roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.56, 0]} castShadow>
        <coneGeometry args={[0.34, 0.18, 9]} />
        <meshStandardMaterial color={damaged ? '#5d4a43' : '#754526'} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.27, 0.31]}>
        <circleGeometry args={[0.055, 12]} />
        <meshBasicMaterial color="#382418" />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <boxGeometry args={[0.6, 0.07, 0.48]} />
        <meshStandardMaterial color="#754526" />
      </mesh>
      {(damaged || smartHive) && (
        <Text
          position={[0, 0.82, 0]}
          fontSize={0.25}
          color={damaged ? '#a82e28' : '#2d6c48'}
          anchorX="center"
          anchorY="middle"
          raycast={() => null}
        >
          {damaged ? '!' : 'S'}
        </Text>
      )}
    </group>
  );
}
