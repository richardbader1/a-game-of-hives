import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { DiceEffect } from './types';
import { envelope } from './drawing';
import { hexPosition } from '../scene/HexTile';

interface BoardEffectsProps {
  effect: DiceEffect;
  reducedMotion: boolean;
  projectTargets: (points: Array<{ x: number; y: number }>) => void;
  registerInvalidation: (callback: (() => void) | null) => void;
}
export function BoardEffectsPass({ effect, reducedMotion, projectTargets, registerInvalidation }: BoardEffectsProps) {
  const { camera, invalidate } = useThree();
  useEffect(() => { registerInvalidation(invalidate); return () => { registerInvalidation(null); projectTargets([]); }; }, [registerInvalidation, invalidate, projectTargets]);
  const point = useMemo(() => new Vector3(), []);
  useFrame(() => {
    projectTargets(effect.targets.map(coord => {
      const { x, z } = hexPosition(coord);
      point.set(x, -0.18, z).project(camera);
      return { x: (point.x + 1) / 2, y: (1 - point.y) / 2 };
    }));
  });
  return effect.type === 'climateChange' && !reducedMotion ? <HeatDistortion key={effect.id} effect={effect} /> : null;
}

function HeatDistortion({ effect }: { effect: DiceEffect }) {
  const { camera, gl, scene, size, invalidate } = useThree();
  const bundleRef = useRef<{ composer: EffectComposer; render: RenderPass; heat: ShaderPass; output: OutputPass } | null>(null);
  // Allocate GPU resources in an effect so StrictMode's setup/cleanup cycle
  // also disposes the first allocation, rather than abandoning a useMemo result.
  useEffect(() => {
    let composer: EffectComposer | undefined;
    try {
      composer = new EffectComposer(gl);
      const render = new RenderPass(scene, camera);
      const heat = new ShaderPass({
        uniforms: { tDiffuse: { value: null }, time: { value: 0 }, strength: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: 'uniform sampler2D tDiffuse; uniform float time; uniform float strength; varying vec2 vUv; void main(){ vec2 uv=vUv; uv.x+=sin(uv.y*65.0-time*3.0)*0.0025*strength; uv.y+=sin(uv.x*47.0+time*2.0)*0.001*strength; gl_FragColor=texture2D(tDiffuse,clamp(uv,0.0,1.0)); }',
      });
      const output = new OutputPass(); composer.addPass(render); composer.addPass(heat); composer.addPass(output);
      bundleRef.current = { composer, render, heat, output };
    } catch { composer?.dispose(); } // Canvas heat waves remain available if postprocessing is unsupported.
    invalidate();
    return () => {
      const bundle = bundleRef.current;
      if (bundle) { bundle.heat.dispose(); bundle.output.dispose(); bundle.render.dispose(); bundle.composer.dispose(); }
      bundleRef.current = null; gl.setRenderTarget(null); invalidate();
    };
  }, [gl, scene, camera, invalidate]);
  useEffect(() => {
    const bundle = bundleRef.current;
    bundle?.composer.setPixelRatio(gl.getPixelRatio()); bundle?.composer.setSize(size.width, size.height); invalidate();
  }, [size.width, size.height, gl, invalidate]);
  useFrame(() => {
    const bundle = bundleRef.current;
    if (!bundle) { gl.render(scene, camera); return; }
    const elapsed = Math.max(0, performance.now() - effect.startedAt);
    bundle.heat.uniforms.time.value = elapsed / 1000;
    bundle.heat.uniforms.strength.value = envelope(Math.min(1, elapsed / effect.duration));
    bundle.composer.render();
  }, 1);
  return null;
}
