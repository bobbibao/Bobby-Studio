import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ToastState {
  message: string;
  status: 'success' | 'error' | 'info' | 'warning';
}

const initialState = null as ToastState | null;

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    showToast: (_state: ToastState | null, action: PayloadAction<ToastState>): ToastState => {
      return action.payload;
    },
    clearToast: (): null => null,
  },
});

export const { showToast, clearToast } = toastSlice.actions;
export default toastSlice.reducer;

