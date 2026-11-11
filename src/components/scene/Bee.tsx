import type { Vector3Tuple } from 'three';

interface BeeProps {
  position: Vector3Tuple;
}

export function Bee({ position }: BeeProps) {
  return (
    <group position={position} scale={0.68}>
      <mesh castShadow>
        <sphereGeometry args={[0.24, 18, 14]} />
        <meshStandardMaterial color="#f4b52f" roughness={0.56} />
      </mesh>
      <mesh position={[0, 0, 0.12]} scale={[0.35, 1.03, 0.86]}>
        <sphereGeometry args={[0.24, 16, 12]} />
        <meshStandardMaterial color="#3a3028" roughness={0.65} />
      </mesh>
      <mesh position={[-0.09, 0.2, -0.02]} rotation={[0.2, 0, -0.28]} scale={[0.8, 0.34, 0.18]}>
        <sphereGeometry args={[0.23, 16, 12]} />
        <meshStandardMaterial color="#eef8ff" roughness={0.35} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0.12, 0.2, -0.02]} rotation={[0.2, 0, 0.28]} scale={[0.8, 0.34, 0.18]}>
        <sphereGeometry args={[0.23, 16, 12]} />
        <meshStandardMaterial color="#eef8ff" roughness={0.35} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0.08, 0.03, 0.19]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshBasicMaterial color="#27231f" />
      </mesh>
    </group>
  );
}
