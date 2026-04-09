import { create } from 'zustand';

interface OutOfPointsModalState {
  isOpen: boolean;
  currentPoints: number;
  openModal: (currentPoints?: number) => void;
  closeModal: () => void;
}

export const useOutOfPointsModal = create<OutOfPointsModalState>((set) => ({
  isOpen: false,
  currentPoints: 0,
  openModal: (currentPoints = 0) => set({ isOpen: true, currentPoints }),
  closeModal: () => set({ isOpen: false }),
}));

