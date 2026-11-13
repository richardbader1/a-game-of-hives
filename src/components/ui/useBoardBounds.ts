import { useLayoutEffect, useState } from 'react';

export interface BoardBounds { left: number; top: number; width: number; height: number }

/** Track the actual, possibly lazy-mounted board without capturing user input. */
export function useBoardBounds(active: boolean, reveal = false, standaloneFallback = false) {
  const [bounds, setBounds] = useState<BoardBounds | null>(null);
  useLayoutEffect(() => {
    if (!active) { setBounds(null); return; }
    let observed: HTMLElement | null = null;
    let revealed = false;
    const update = () => {
      const board = document.querySelector<HTMLElement>('.game-board-canvas');
      if (!board && (!standaloneFallback || document.querySelector('.game-screen'))) return;
      if (board && observed !== board) { resize.observe(board); observed = board; }
      if (board && (!board.getBoundingClientRect().width || !board.getBoundingClientRect().height)) return;
      if (board && reveal && !revealed) { revealed = true; board.scrollIntoView({ block: 'center', behavior: 'instant' }); }
      const next = board?.getBoundingClientRect() ?? { left: 16, top: 80, width: window.innerWidth - 32, height: Math.max(180, window.innerHeight - 160) };
      setBounds(previous => previous && previous.left === next.left && previous.top === next.top && previous.width === next.width && previous.height === next.height ? previous : { left: next.left, top: next.top, width: next.width, height: next.height });
    };
    const resize = new ResizeObserver(update);
    const mounting = new MutationObserver(update);
    mounting.observe(document.body, { childList: true, subtree: true });
    update(); window.addEventListener('resize', update); window.addEventListener('scroll', update, true);
    return () => { resize.disconnect(); mounting.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [active, reveal, standaloneFallback]);
  return bounds;
}
