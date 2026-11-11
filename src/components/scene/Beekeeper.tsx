import type { Vector3Tuple } from 'three';

interface BeekeeperProps {
  position: Vector3Tuple;
}

export function Beekeeper({ position }: BeekeeperProps) {
  return (
    <group position={position} scale={0.78}>
      <mesh position={[0, 0.36, 0]} castShadow>
        <capsuleGeometry args={[0.17, 0.3, 5, 10]} />
        <meshStandardMaterial color="#477b69" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 12]} />
        <meshStandardMaterial color="#e1ae83" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.83, 0]}>
        <cylinderGeometry args={[0.28, 0.25, 0.09, 12]} />
        <meshStandardMaterial color="#efc95d" roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.13, 12]} />
        <meshStandardMaterial color="#f3d87d" roughness={0.78} />
      </mesh>
    </group>
  );
}
