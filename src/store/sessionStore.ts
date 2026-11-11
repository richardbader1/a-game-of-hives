import { create } from 'zustand';
import type { GameSnapshot } from '../game/types';
import { decodeSave, encodeSave, SAVE_KEY } from '../game/persistence/saveGame';
import { useGameStore } from './gameStore';

interface SessionState {
  savedGame: GameSnapshot | null;
  notice: string | null;
}

export const useSessionStore = create<SessionState>(() => ({ savedGame: null, notice: null }));
type SaveStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Explicit startup, separate from React rendering and safe when storage is blocked. */
export function initializePersistence(storage?: SaveStorage): () => void {
  let target: SaveStorage;
  try {
    target = storage ?? window.localStorage;
    const loaded = decodeSave(target.getItem(SAVE_KEY));
    useSessionStore.setState({ savedGame: loaded.snapshot, notice: loaded.notice });
  } catch {
    useSessionStore.setState({ savedGame: null, notice: 'Saving is unavailable in this browser. You can still play; keep this tab open.' });
    return () => {};
  }
  return useGameStore.subscribe((state, previous) => {
    try {
      if (state.phase === 'ready') {
        target.setItem(SAVE_KEY, encodeSave(state));
        useSessionStore.setState({ notice: null });
      } else if (previous.phase === 'ready' && state.phase === 'playerSetup') {
        target.removeItem(SAVE_KEY);
        useSessionStore.setState({ savedGame: null, notice: null });
      }
    } catch {
      useSessionStore.setState({ notice: 'Your latest progress could not be saved. You can keep playing; keep this tab open.' });
    }
  });
}

export function resumeSavedGame(): void {
  const saved = useSessionStore.getState().savedGame;
  if (!saved) return;
  useGameStore.setState(saved);
  useSessionStore.setState({ savedGame: null });
}

export function discardSavedGame(): void {
  try {
    window.localStorage.removeItem(SAVE_KEY);
    useSessionStore.setState({ savedGame: null, notice: null });
  } catch {
    useSessionStore.setState({ savedGame: null, notice: 'The old save could not be removed. A started game will replace it when saving is available.' });
  }
  useGameStore.getState().reset();
}
