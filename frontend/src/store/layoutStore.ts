import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useState } from 'react';

// Define the type for the store state
interface LayoutState {
  columns: number;
  setColumns: (cols: number) => void;
}

// Create Zustand store with strict types
const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      columns: 3,
      setColumns: (cols: number) => set({ columns: cols }),
    }),
    {
      name: 'favorite-layout-storage',
    }
  )
);

export default useLayoutStore;

