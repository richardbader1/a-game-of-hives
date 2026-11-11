import { useRef } from 'react';
import type { Group } from 'three';
import { GameModel } from './GameModel';
import { Piece, type PieceProps } from './Piece';
import { useIdleMotion } from './SceneMotion';

export function Bee({ position, onSelect }: PieceProps) {
  const idle = useRef<Group>(null);
  useIdleMotion(idle, 'bee');
  return <Piece kind="bee" position={position} onSelect={onSelect}>
    <group ref={idle} scale={0.78}><GameModel kind="bee" /></group>
  </Piece>;
}
