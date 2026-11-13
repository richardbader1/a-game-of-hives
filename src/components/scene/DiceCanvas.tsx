import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Clone, Environment, Html, Lightformer, useGLTF } from '@react-three/drei';
import { Euler, type Group, type Mesh, type ShaderMaterial } from 'three';
import { DICE_TRAVEL_DURATION_MS, REDUCED_ROLL_DURATION_MS, ROLL_DURATION_MS } from '../../game/config/dice';
import { settledDiceRotation, tumbleRotation } from './diceOrientation';
import { tabletopPose } from './diceTabletopMotion';
import { DIE_EVENTS } from '../../game/config/dice';
import { eventName } from '../../game/engine/gameEngine';

const DICE_MODEL_URL = `${import.meta.env.BASE_URL}models/a_game_of_hives_dice_gtac_glossy.glb`;

export interface DiceCanvasProps {
  face: number;
  roll: { id: number; startedAt: number } | null;
  reducedMotion: boolean;
  tabletop?: boolean;
  onSettled: (id: number) => void;
}

function Die({ face, roll, reducedMotion, tabletop = false, onSettled }: DiceCanvasProps) {
  const { scene } = useGLTF(DICE_MODEL_URL);
  const group = useRef<Group>(null);
  const animation = useRef<{ id: number; start: Euler } | null>(null);
  const initialRotation = useRef(settledDiceRotation(face)).current;
  const settledId = useRef<number | null>(null);
  const completionFrame = useRef<number | null>(null);
  const shadow = useRef<Mesh>(null);
  const shadowMaterial = useRef<ShaderMaterial>(null);
  const shadowUniforms = useRef({ opacity: { value: 0.22 } }).current;
  const beganAt = useRef(Date.now()).current;
  const resultAnchor = useRef<Group>(null);
  const resultLabel = useRef<HTMLSpanElement>(null);
  const invalidate = useThree(s => s.invalidate);
  const { viewport, size } = useThree();
  const target = settledDiceRotation(face);
  useEffect(() => () => {
    if (completionFrame.current !== null) cancelAnimationFrame(completionFrame.current);
  }, [roll?.id]);
  useEffect(() => { invalidate(); }, [face, roll?.id, reducedMotion, tabletop, size.width, size.height, invalidate]);
  useFrame(() => {
    if (!group.current) return;
    const pixels = Math.min(150, size.width * 0.22, size.height * 0.34);
    const dieSize = tabletop ? pixels * viewport.height / Math.max(size.height, 1) : 1;
    const elapsed = Math.max(0, Date.now() - beganAt);
    if (shadow.current) shadow.current.visible = Boolean(roll && tabletop && !reducedMotion);
    if (!roll) {
      group.current.rotation.copy(target); group.current.position.set(0, 0, 0); group.current.scale.setScalar(1);
      animation.current = null;
      return;
    }
    const finishAfterPaint = () => {
      if (settledId.current === roll.id) return;
      settledId.current = roll.id;
      // useFrame precedes gl.render; commit on the next frame, after this pose paints.
      completionFrame.current = requestAnimationFrame(() => onSettled(roll.id));
    };
    if (reducedMotion) {
      group.current.rotation.copy(target); group.current.position.set(0, 0, 0); group.current.scale.setScalar(dieSize);
      if (resultAnchor.current) resultAnchor.current.position.set(0, dieSize * 0.95, 0);
      if (resultLabel.current) resultLabel.current.style.opacity = '1';
      if (elapsed < REDUCED_ROLL_DURATION_MS) invalidate();
      else finishAfterPaint();
      return;
    }
    if (animation.current?.id !== roll.id) animation.current = { id: roll.id, start: group.current.rotation.clone() };
    const progress = Math.min(1, elapsed / DICE_TRAVEL_DURATION_MS);
    group.current.rotation.set(...tumbleRotation(animation.current.start, target, progress));
    if (tabletop) {
      const pose = tabletopPose(progress, viewport.width, viewport.height, dieSize);
      group.current.scale.setScalar(dieSize);
      group.current.position.set(pose.x, pose.y, 0);
      group.current.rotation.z += pose.wobble;
      if (resultAnchor.current) resultAnchor.current.position.set(pose.x, pose.groundY + dieSize * 0.95, 0);
      if (resultLabel.current) resultLabel.current.style.opacity = progress === 1 ? '1' : '0';
      if (shadow.current) {
        // Compensate for perspective so the ground shadow stays under the die.
        const depthScale = (3.3 + 0.8) / 3.3;
        shadow.current.position.set(pose.x * depthScale, (pose.groundY - dieSize * 0.64) * depthScale, -0.8);
        const softness = 1 + pose.bounce / Math.max(dieSize, 0.01);
        shadow.current.scale.set(dieSize * 0.85 * softness * depthScale, dieSize * 0.22 * softness * depthScale, 1);
        if (shadowMaterial.current) shadowMaterial.current.uniforms.opacity.value = 0.34 / softness;
      }
    } else {
      group.current.position.set(0, Math.sin(progress * Math.PI) * 0.22, 0); group.current.scale.setScalar(1);
    }
    if (elapsed < ROLL_DURATION_MS) invalidate(); else finishAfterPaint();
  });
  return <>
    <group ref={resultAnchor}><Html center zIndexRange={[1, 1]} style={{ pointerEvents: 'none' }}><span ref={resultLabel} className="dice-landing-label" style={{ opacity: 0 }} aria-hidden="true">Landed: {DIE_EVENTS[face - 1] === 'garden' ? 'Improvement' : eventName(DIE_EVENTS[face - 1])}</span></Html></group>
    <mesh ref={shadow} name="dice-table-shadow" visible={false} raycast={() => null}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={shadowMaterial} uniforms={shadowUniforms} transparent depthWrite={false}
        vertexShader="varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }"
        fragmentShader="varying vec2 vUv; uniform float opacity; void main() { float alpha = 1.0 - smoothstep(0.05, 0.5, length(vUv - 0.5)); gl_FragColor = vec4(0.08, 0.12, 0.09, alpha * opacity); }" />
    </mesh>
    <group ref={group} name="environment-die" rotation={initialRotation}>
    {/* Unlike the vertex-painted board pieces, this model has authored glossy materials. */}
    <Clone object={scene} dispose={null} />
    </group>
  </>;
}

useGLTF.preload(DICE_MODEL_URL);

export default function DiceCanvas(props: DiceCanvasProps) {
  return <Canvas frameloop="demand" camera={{ position: [0, 0, 3.3], fov: 34 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
    <ambientLight intensity={0.7} />
    <directionalLight position={[3, 4, 5]} intensity={1.6} />
    <directionalLight position={[-3, 1, 2]} intensity={0.5} />
    <Environment resolution={64} frames={1} environmentIntensity={0.65}>
      <Lightformer intensity={3} position={[-2, 3, 3]} scale={[2, 4, 1]} />
      <Lightformer intensity={1.5} position={[3, 1, 2]} rotation={[0, -Math.PI / 4, 0]} scale={[1, 3, 1]} />
    </Environment>
    <Die {...props} />
  </Canvas>;
}
