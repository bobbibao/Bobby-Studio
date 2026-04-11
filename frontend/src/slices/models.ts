import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getModels } from '@/features/models';
import { ModelCatalogItem, ModelsResponse } from '@/types/modelCatalog';
import { mapCatalogToPlan } from '@/constants/models';

export const FETCHING_STATUS_IDLE = 'idle';
export const FETCHING_STATUS_LOADING = 'loading';
export const FETCHING_STATUS_SUCCEEDED = 'succeeded';
export const FETCHING_STATUS_FAILED = 'failed';

export type FetchingStatus =
  | typeof FETCHING_STATUS_IDLE
  | typeof FETCHING_STATUS_LOADING
  | typeof FETCHING_STATUS_SUCCEEDED
  | typeof FETCHING_STATUS_FAILED;

interface ModelsState {
  items: ModelCatalogItem[];
  status: FetchingStatus;
  error: string | null;
  plan: string | null;
  source: 'api' | 'fallback';
}

const initialPlan = 'FREE';
const initialState: ModelsState = {
  items: mapCatalogToPlan(initialPlan),
  status: FETCHING_STATUS_IDLE,
  error: null,
  plan: initialPlan,
  source: 'fallback',
};

export const fetchModels = createAsyncThunk<
  ModelsResponse,
  string | undefined,
  { rejectValue: string }
>('models/fetch', async (_plan, thunkAPI) => {
  try {
    return await getModels();
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Unable to load models';
    return thunkAPI.rejectWithValue(message);
  }
});

const modelsSlice = createSlice({
  name: 'models',
  initialState,
  reducers: {
    setModelsFromFallback(state, action: PayloadAction<{ plan?: string | null }>) {
      const plan = action.payload.plan || state.plan || initialPlan;
      state.items = mapCatalogToPlan(plan);
      state.plan = plan;
      state.source = 'fallback';
      state.error = null;
      state.status = FETCHING_STATUS_SUCCEEDED;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchModels.pending, (state) => {
        state.status = FETCHING_STATUS_LOADING;
        state.error = null;
      })
      .addCase(fetchModels.fulfilled, (state, action) => {
        state.status = FETCHING_STATUS_SUCCEEDED;
        state.items = action.payload.models;
        state.plan = action.payload.plan;
        state.error = null;
        state.source = 'api';
      })
      .addCase(fetchModels.rejected, (state, action) => {
        const plan = action.meta.arg || state.plan || initialPlan;
        state.items = mapCatalogToPlan(plan);
        state.plan = plan;
        state.status = FETCHING_STATUS_FAILED;
        state.error = action.payload || action.error.message || 'Unknown error';
        state.source = 'fallback';
      });
  },
});

export const { setModelsFromFallback } = modelsSlice.actions;
export const modelsReducer = modelsSlice.reducer;

