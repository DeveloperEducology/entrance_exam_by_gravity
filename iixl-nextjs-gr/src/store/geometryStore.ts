
import { create } from 'zustand';

interface Point {
  x: number;
  y: number;
}

interface GeometryState {
  points: Record<string, Point>;
  gridScale: number;
  activeVisualizer: string;
  isDragging: boolean;
  
  // Actions
  updatePoint: (id: string, x: number, y: number) => void;
  setDragging: (dragging: boolean) => void;
  resetPoints: () => void;
  setActiveVisualizer: (id: string) => void;
}

const DEFAULT_POINTS: Record<string, Point> = {
  A: { x: -3, y: 2 },
  B: { x: 4, y: -2 }
};

export const useGeometryStore = create<GeometryState>((set) => ({
  points: DEFAULT_POINTS,
  gridScale: 40, // pixels per unit
  activeVisualizer: 'distance',
  isDragging: false,

  updatePoint: (id, x, y) => set((state) => ({
    points: {
      ...state.points,
      [id]: { x, y }
    }
  })),

  setDragging: (dragging) => set({ isDragging: dragging }),

  resetPoints: () => set({ points: DEFAULT_POINTS }),

  setActiveVisualizer: (id) => set({ activeVisualizer: id })
}));
