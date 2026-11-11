import { useEffect, useRef } from 'react';
import { MapControls, OrthographicCamera } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { MOUSE, TOUCH, type OrthographicCamera as Camera } from 'three';
import type { MapControls as Controls } from 'three-stdlib';
import type { GamePhase, HexCoord } from '../../game/types';
import { CAMERA_FRAME, CAMERA_OFFSET, fitBoard } from './boardFraming';

export function BoardCamera({ coords, phase, resetRequest }: { coords: HexCoord[]; phase: GamePhase; resetRequest: number }) {
  const cameraRef = useRef<Camera>(null);
  const controlsRef = useRef<Controls>(null);
  const { size, gl, invalidate } = useThree();
  const layout = coords.map(c => `${c.q},${c.r}`).join(';');
  const latestCoords = useRef(coords);
  latestCoords.current = coords;

  useEffect(() => {
    const camera = cameraRef.current, controls = controlsRef.current;
    if (!camera || !controls || !size.width || !size.height) return;
    const board = gl.domElement.getBoundingClientRect();
    let left = 12, top = 12, right = size.width - 12, bottom = size.height - 12;
    if (phase === 'ready') {
      const panel = document.querySelector('.gameplay-panel')?.getBoundingClientRect();
      const toolbar = document.querySelector('.game-resource-toolbar')?.getBoundingClientRect();
      const actions = document.querySelector('.action-card')?.getBoundingClientRect();
      const trades = document.querySelector('.trade-card > .section-heading')?.getBoundingClientRect();
      if (toolbar) top = Math.max(top, toolbar.bottom - board.top + 12);
      if (panel) {
        if (size.width > 900) right = Math.min(right, panel.left - board.left - 12);
        else top = Math.max(top, panel.bottom - board.top + 12);
      }
      for (const rect of [actions, trades]) if (rect) bottom = Math.min(bottom, rect.top - board.top - 12);
      // Small screens may require panning around overlays; retain a usable framing area.
      if (bottom - top < 100) top = Math.max(12, bottom - 100);
    }
    const fit = fitBoard(latestCoords.current, size.width, size.height, {
      left, top, width: Math.max(100, right - left), height: Math.max(100, bottom - top),
    });
    const aspect = size.width / size.height;
    camera.left = -CAMERA_FRAME * aspect; camera.right = CAMERA_FRAME * aspect;
    camera.top = CAMERA_FRAME; camera.bottom = -CAMERA_FRAME;
    camera.zoom = fit.zoom;
    camera.position.set(fit.x + CAMERA_OFFSET.x, CAMERA_OFFSET.y, fit.z + CAMERA_OFFSET.z);
    camera.lookAt(fit.x, 0, fit.z);
    camera.updateProjectionMatrix();
    controls.target.set(fit.x, 0, fit.z);
    controls.minZoom = Math.min(0.15, fit.zoom);
    controls.update();
    invalidate();
  }, [layout, phase, resetRequest, size.width, size.height, gl, invalidate]);

  return <>
    <OrthographicCamera ref={cameraRef} makeDefault manual position={[CAMERA_OFFSET.x, CAMERA_OFFSET.y, CAMERA_OFFSET.z]} near={0.1} far={500} />
    <MapControls ref={controlsRef} makeDefault enableRotate={false} enablePan enableZoom
      minZoom={0.02} maxZoom={2.8} screenSpacePanning enableDamping dampingFactor={0.12}
      mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
      touches={{ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN }}
      onChange={() => {
        const camera = cameraRef.current, controls = controlsRef.current;
        if (!camera || !controls) return;
        // Clamp by translation, preserving the camera/target offset and isometric angle.
        const positions = latestCoords.current.map(c => ({ x: Math.sqrt(3) * (c.q + c.r / 2), z: 1.5 * c.r }));
        const margin = Math.max(6, size.width / Math.max(size.height, 1) * CAMERA_FRAME / camera.zoom);
        const xs = positions.map(p => p.x), zs = positions.map(p => p.z);
        const x = Math.max(Math.min(0, ...xs) - margin, Math.min(Math.max(0, ...xs) + margin, controls.target.x));
        const z = Math.max(Math.min(0, ...zs) - margin, Math.min(Math.max(0, ...zs) + margin, controls.target.z));
        camera.position.x += x - controls.target.x; camera.position.z += z - controls.target.z;
        controls.target.set(x, controls.target.y, z);
        invalidate();
      }} />
  </>;
}
