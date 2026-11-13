import { Euler, Matrix4, Quaternion, Vector3 } from 'three';

// Outward normals and artwork-up vectors from the supplied, centred, Y-up GLB.
export const DIE_FACES = [
  { normal: [1, 0, 0], up: [0, 1, 0], mesh: 'Face_Varroa_Mite' },
  { normal: [0, 0, -1], up: [0, 1, 0], mesh: 'Face_Climate_Change_Habitat_Loss' },
  { normal: [0, 1, 0], up: [0, 0, -1], mesh: 'Face_Pesticides' },
  { normal: [0, 0, 1], up: [0, 1, 0], mesh: 'Face_Extreme_Weather' },
  { normal: [-1, 0, 0], up: [0, 1, 0], mesh: 'Face_Improvement_Left' },
  { normal: [0, -1, 0], up: [0, 0, 1], mesh: 'Face_Improvement_Bottom' },
] as const;

/** The selected symbol is the dominant upper face; side faces remain secondary. */
export function settledDiceRotation(face: number): Euler {
  const entry = DIE_FACES[face - 1] ?? DIE_FACES[4];
  const normal = new Vector3(...entry.normal);
  const up = new Vector3(...entry.up);
  const right = up.clone().cross(normal);
  const orientation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right, up, normal)).invert();
  const tilt = new Quaternion().setFromEuler(new Euler(-0.5, 0.07, 0));
  return new Euler().setFromQuaternion(tilt.multiply(orientation));
}

export function tumbleRotation(start: Euler, end: Euler, progress: number): [number, number, number] {
  const remaining = (1 - Math.min(1, Math.max(0, progress))) ** 3;
  return [
    end.x + (start.x - end.x + Math.PI * 6) * remaining,
    end.y + (start.y - end.y + Math.PI * 8) * remaining,
    end.z + (start.z - end.z + Math.PI * 4) * remaining,
  ];
}
