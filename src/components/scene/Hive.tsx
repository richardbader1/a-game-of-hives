import { Billboard } from '@react-three/drei';
import { GameModel } from './GameModel';
import { Piece, type PieceProps } from './Piece';

interface HiveProps extends PieceProps {
  damaged?: boolean;
  smartHive?: boolean;
}

/** Show damage and protection together without replacing the GLB's vertex-colour materials. */
function HiveBadge({ damaged, x }: { damaged: boolean; x: number }) {
  return <Billboard name={damaged ? 'hive-damaged-indicator' : 'hive-smart-indicator'} position={[x, 0.74, 0]}>
    <mesh><circleGeometry args={[0.12, 20]} /><meshBasicMaterial color={damaged ? '#a72f28' : '#276b4d'} /></mesh>
    {damaged ? <>
      <mesh position={[0, 0.025, 0.005]}><planeGeometry args={[0.028, 0.1]} /><meshBasicMaterial color="white" /></mesh>
      <mesh position={[0, -0.055, 0.005]}><circleGeometry args={[0.017, 8]} /><meshBasicMaterial color="white" /></mesh>
    </> : <>
      <mesh position={[-0.032, -0.018, 0.005]} rotation={[0, 0, Math.PI / 4]}><planeGeometry args={[0.026, 0.075]} /><meshBasicMaterial color="white" /></mesh>
      <mesh position={[0.023, 0.008, 0.005]} rotation={[0, 0, -Math.PI / 4]}><planeGeometry args={[0.026, 0.13]} /><meshBasicMaterial color="white" /></mesh>
    </>}
  </Billboard>;
}

export function Hive({ position, damaged = false, smartHive = false, onSelect }: HiveProps) {
  return <Piece kind="hive" position={position} onSelect={onSelect}>
    <group scale={0.9}><GameModel kind="hive" /></group>
    {damaged && <mesh name="hive-damage-ring" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
      <ringGeometry args={[0.34, 0.39, 24]} /><meshBasicMaterial color="#a72f28" />
    </mesh>}
    {damaged && <HiveBadge damaged x={smartHive ? -0.14 : 0} />}
    {smartHive && <HiveBadge damaged={false} x={damaged ? 0.14 : 0} />}
  </Piece>;
}
