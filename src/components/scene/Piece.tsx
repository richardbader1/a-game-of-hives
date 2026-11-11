import { useEffect, type ReactNode } from 'react';
import type { Vector3Tuple } from 'three';

export interface PieceProps {
  position: Vector3Tuple;
  onSelect?: () => void;
}

/** Model hits delegate to the same tile handler as clicks on the surrounding hex. */
export function Piece({ position, onSelect, kind, children }: PieceProps & { kind: string; children: ReactNode }) {
  useEffect(() => () => { document.body.style.cursor = ''; }, []);
  return <group name={`piece-${kind}`} position={position}
    onClick={event => {
      if (!onSelect || event.delta > 4) return;
      event.stopPropagation(); onSelect();
    }}
    onPointerOver={event => {
      if (onSelect) { event.stopPropagation(); document.body.style.cursor = 'pointer'; }
    }}
    onPointerOut={() => { document.body.style.cursor = ''; }}>
    {children}
  </group>;
}
