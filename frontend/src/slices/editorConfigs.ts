import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IEditorConfigResponse } from '../types/configs';

interface EditorConfigState {
  configs: IEditorConfigResponse;
}

const initialState: EditorConfigState = {
  configs: {
    inspiration: null,
  },
};

const editorConfigSlice = createSlice({
  name: 'editorConfigs',
  initialState,
  reducers: {
    setEditorConfigs(state, action: PayloadAction<IEditorConfigResponse>) {
      state.configs = action.payload;
    },
  },
});

export const { setEditorConfigs } = editorConfigSlice.actions;
export const editorConfigsReducer = editorConfigSlice.reducer;

