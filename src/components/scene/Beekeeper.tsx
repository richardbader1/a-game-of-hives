import { useRef } from 'react';
import type { Group } from 'three';
import { GameModel } from './GameModel';
import { Piece, type PieceProps } from './Piece';
import { useIdleMotion } from './SceneMotion';

export function Beekeeper({ position, onSelect }: PieceProps) {
  const idle = useRef<Group>(null);
  useIdleMotion(idle, 'beekeeper');
  return <Piece kind="beekeeper" position={position} onSelect={onSelect}>
    <group ref={idle} scale={0.7}><GameModel kind="beekeeper" /></group>
  </Piece>;
}
