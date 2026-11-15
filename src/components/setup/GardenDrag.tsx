import { createContext, useCallback, useContext, useEffect, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../../store/gameStore';
import type { HexCoord, ResourceType } from '../../game/types';
import { ResourceIcon } from '../ui/ResourceIcon';

type HitTest = (x: number, y: number) => HexCoord | null;
interface Drag { resource: ResourceType; x: number; y: number; target: HexCoord | null }
interface DragContext {
  drag: Drag | null; feedback: string;
  begin: (resource: ResourceType, event: ReactPointerEvent<HTMLButtonElement>) => void;
  choose: (resource: ResourceType, event: MouseEvent<HTMLButtonElement>) => void;
  register: (test: HitTest) => () => void;
}
const Context = createContext<DragContext>({ drag: null, feedback: '', begin: () => {}, choose: resource => useGameStore.getState().selectResource(resource), register: () => () => {} });
export const useGardenDrag = () => useContext(Context);

/** Pointer capture starts on the selector, so setup dragging never pans the board. */
export function GardenDragProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [feedback, setFeedback] = useState('');
  const pending = useRef<{ id: number; resource: ResourceType; x: number; y: number; active: boolean; button: HTMLButtonElement } | null>(null);
  const hitTest = useRef<HitTest | null>(null);
  const suppressClickUntil = useRef(0);
  const register = useCallback((test: HitTest) => { hitTest.current = test; return () => { if (hitTest.current === test) hitTest.current = null; }; }, []);
  const begin = useCallback((resource: ResourceType, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!enabled || !event.isPrimary || event.button !== 0 || pending.current) return;
    suppressClickUntil.current = 0; // A fresh press is intentional, even just after a drop.
    pending.current = { id: event.pointerId, resource, x: event.clientX, y: event.clientY, active: false, button: event.currentTarget };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setFeedback('');
  }, [enabled]);
  const choose = useCallback((resource: ResourceType, event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0 && performance.now() < suppressClickUntil.current) { event.preventDefault(); return; }
    useGameStore.getState().selectResource(resource);
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let scrollFrame = 0;
    let pointerPosition: { x: number; y: number } | null = null;
    const scroll = () => {
      if (!pending.current?.active || !pointerPosition) return;
      const { x, y } = pointerPosition;
      const step = y < 64 ? -12 : y > window.innerHeight - 64 ? 12 : 0;
      if (step) {
        window.scrollBy(0, step);
        setDrag(current => current ? { ...current, target: hitTest.current?.(x, y) ?? null } : null);
      }
      scrollFrame = requestAnimationFrame(scroll);
    };
    function finish(cancelled: boolean, event?: PointerEvent) {
      const source = pending.current;
      if (!source || (event && source.id !== event.pointerId)) return;
      pending.current = null;
      cancelAnimationFrame(scrollFrame);
      if (source.active) {
        suppressClickUntil.current = performance.now() + 500;
        event?.preventDefault();
        if (cancelled) setFeedback('Placement cancelled. Choose a resource and try again.');
        else {
          const target = hitTest.current?.(event!.clientX, event!.clientY);
          const game = useGameStore.getState();
          if (game.phase === 'gardenSetup' && target) {
            game.selectResource(source.resource);
            // Exactly the command used by click and keyboard placement; the engine
            // rechecks adjacency, occupancy, supply and the five-tile limit.
            game.placeGardenTile(target.q, target.r);
            const next = useGameStore.getState();
            setFeedback(next.tiles.length > game.tiles.length ? `${source.resource} tile placed.` : next.error ?? 'Choose a highlighted empty space beside your garden.');
          } else setFeedback('Drop on a highlighted garden space. Your tile has not been placed.');
        }
      }
      if (source.button.hasPointerCapture?.(source.id)) source.button.releasePointerCapture(source.id);
      setDrag(null);
    }
    const move = (event: PointerEvent) => {
      const source = pending.current;
      if (!source || source.id !== event.pointerId) return;
      if (!source.active && Math.hypot(event.clientX - source.x, event.clientY - source.y) < 7) return;
      pointerPosition = { x: event.clientX, y: event.clientY };
      if (!source.active) { source.active = true; useGameStore.getState().selectResource(source.resource); scrollFrame = requestAnimationFrame(scroll); }
      event.preventDefault();
      setDrag({ resource: source.resource, x: event.clientX, y: event.clientY, target: hitTest.current?.(event.clientX, event.clientY) ?? null });
    };
    const up = (event: PointerEvent) => finish(false, event);
    const cancel = (event: PointerEvent) => finish(true, event);
    const blur = () => finish(true);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') finish(true); };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up, { passive: false });
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('lostpointercapture', cancel);
    window.addEventListener('blur', blur);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel); window.removeEventListener('lostpointercapture', cancel);
      window.removeEventListener('blur', blur); window.removeEventListener('keydown', escape);
      cancelAnimationFrame(scrollFrame);
      const source = pending.current; pending.current = null;
      if (source?.button.hasPointerCapture?.(source.id)) source.button.releasePointerCapture(source.id);
      setDrag(null);
    };
  }, [enabled]);
  return <Context.Provider value={{ drag, feedback, begin, choose, register }}>
    {children}
    {drag && createPortal(<div className="garden-drag-preview" style={{ left: drag.x + 14, top: drag.y + 14 }} aria-hidden="true"><ResourceIcon resource={drag.resource} />{drag.resource}</div>, document.body)}
  </Context.Provider>;
}

