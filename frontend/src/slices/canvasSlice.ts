import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

export interface CanvasImage {
  id: string;
  url?: string; // Optional for pending images
  position: { x: number; y: number };
  type: 'uploaded' | 'generated';
  width?: number;
  height?: number;
  status?: 'pending' | 'completed'; // Track if image is still generating
  jobId?: string; // Track job ID for pending images
  metadata?: any;
}

export interface Canvas {
  id: string;
  name: string;
  images: CanvasImage[];
  createdAt: number;
  updatedAt: number;
}

interface CanvasState {
  canvases: Canvas[];
  activeCanvasId: string | null;
}

const initialCanvasId = uuidv4();

const initialState: CanvasState = {
  canvases: [
    {
      id: initialCanvasId,
      name: 'Untitled Canvas',
      images: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ],
  activeCanvasId: initialCanvasId,
};

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    createCanvas: (state, action: PayloadAction<string>) => {
      const newCanvas: Canvas = {
        id: uuidv4(),
        name: action.payload || 'New Canvas',
        images: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      state.canvases.push(newCanvas);
      state.activeCanvasId = newCanvas.id;
    },
    setActiveCanvas: (state, action: PayloadAction<string>) => {
      state.activeCanvasId = action.payload;
    },
    renameCanvas: (state, action: PayloadAction<{ id: string; name: string }>) => {
      const canvas = state.canvases.find((c) => c.id === action.payload.id);
      if (canvas) {
        canvas.name = action.payload.name;
        canvas.updatedAt = Date.now();
      }
    },
    deleteCanvas: (state, action: PayloadAction<string>) => {
      state.canvases = state.canvases.filter((c) => c.id !== action.payload);
      if (state.activeCanvasId === action.payload) {
        state.activeCanvasId = state.canvases.length > 0 ? state.canvases[0].id : null;
      }
    },
    addImageToCanvas: (state, action: PayloadAction<{ canvasId?: string; image: Omit<CanvasImage, 'id' | 'position'> & { position?: { x: number, y: number } } }>) => {
      const targetId = action.payload.canvasId || state.activeCanvasId;
      if (!targetId) return;

      const canvas = state.canvases.find((c) => c.id === targetId);
      if (canvas) {
        const newImage: CanvasImage = {
          id: uuidv4(),
          position: action.payload.image.position || { x: 100, y: 100 }, // Default position
          ...action.payload.image,
        };
        canvas.images.push(newImage);
        canvas.updatedAt = Date.now();
      }
    },
    updateImagePosition: (state, action: PayloadAction<{ canvasId?: string; imageId: string; position: { x: number; y: number } }>) => {
      const targetId = action.payload.canvasId || state.activeCanvasId;
      if (!targetId) return;

      const canvas = state.canvases.find((c) => c.id === targetId);
      if (canvas) {
        const image = canvas.images.find((img) => img.id === action.payload.imageId);
        if (image) {
          image.position = action.payload.position;
          canvas.updatedAt = Date.now();
        }
      }
    },
    updateImageFromPending: (
      state,
      action: PayloadAction<{ canvasId?: string; jobId: string; url: string; width?: number; height?: number; metadata?: any }>
    ) => {
      const targetId = action.payload.canvasId || state.activeCanvasId;
      if (!targetId) return;

      const canvas = state.canvases.find((c) => c.id === targetId);
      if (canvas) {
        const image = canvas.images.find((img) => img.jobId === action.payload.jobId && img.status === 'pending');
        if (image) {
          image.url = action.payload.url;
          image.status = 'completed';
          image.width = action.payload.width;
          image.height = action.payload.height;
          if (action.payload.metadata) {
            image.metadata = {
              ...image.metadata,
              ...action.payload.metadata,
            };
          }
          canvas.updatedAt = Date.now();
        }
      }
    },
    removeImageFromCanvas: (state, action: PayloadAction<{ canvasId?: string; imageId: string }>) => {
      const targetId = action.payload.canvasId || state.activeCanvasId;
      if (!targetId) return;

      const canvas = state.canvases.find((c) => c.id === targetId);
      if (canvas) {
        canvas.images = canvas.images.filter((img) => img.id !== action.payload.imageId);
        canvas.updatedAt = Date.now();
      }
    },
  },
});

export const {
  createCanvas,
  setActiveCanvas,
  renameCanvas,
  deleteCanvas,
  addImageToCanvas,
  updateImagePosition,
  removeImageFromCanvas,
  updateImageFromPending,
} = canvasSlice.actions;

export const selectActiveCanvas = (state: { canvas: CanvasState }) =>
  state.canvas.canvases.find((c) => c.id === state.canvas.activeCanvasId);

export const selectAllCanvases = (state: { canvas: CanvasState }) => state.canvas.canvases;

export const canvasReducer = canvasSlice.reducer;

