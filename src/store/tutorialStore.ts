import { create } from 'zustand';

// Presentation only: tutorial progress never enters a game snapshot or save.
interface TutorialState {
  active: boolean;
  reviewed: string[];
  history: Array<{ id: string; title: string; body: string; target: string; instruction: string }>;
  reviewIndex: number | null;
  start: () => void;
  skip: () => void;
  acknowledge: (id: string) => void;
}
export const useTutorialStore = create<TutorialState>((set) => ({
  active: false, reviewed: [], history: [], reviewIndex: null,
  start: () => set({ active: true, reviewed: [], history: [], reviewIndex: null }),
  skip: () => set({ active: false, reviewIndex: null }),
  acknowledge: id => set(state => ({ reviewed: [...state.reviewed, id], reviewIndex: null })),
}));
