import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group } from 'three';

const MotionEnabled = createContext(false);

/** One 20 Hz clock for both characters; demand rendering when motion is disabled or offscreen. */
export function SceneMotion({ children, active }: { children: ReactNode; active: boolean }) {
  const { gl, invalidate } = useThree();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true;
    const update = () => setEnabled(visible && !document.hidden && !preference.matches);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(gl.domElement);
    preference.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      observer.disconnect(); preference.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [gl]);
  useEffect(() => {
    invalidate();
    if (!enabled || !active) return;
    const timer = window.setInterval(() => invalidate(), 50);
    return () => window.clearInterval(timer);
  }, [enabled, active, invalidate]);
  return <MotionEnabled.Provider value={enabled && active}>{children}</MotionEnabled.Provider>;
}

export function useIdleMotion(ref: RefObject<Group>, kind: 'bee' | 'beekeeper') {
  const enabled = useContext(MotionEnabled);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;
    if (enabled) elapsed.current += Math.min(delta, 0.1);
    group.position.y = enabled && kind === 'bee' ? 0.035 + Math.sin(elapsed.current * 2.6) * 0.025 : 0;
    group.rotation.z = enabled ? Math.sin(elapsed.current * (kind === 'bee' ? 1.8 : 1.2)) * (kind === 'bee' ? 0.035 : 0.018) : 0;
  });
}
