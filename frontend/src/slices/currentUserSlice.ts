import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { changeLanguage } from 'i18next';
import { SubscriptionResponseDtoV2 } from '@/features/admin/pages/admin/profile/types/subscriptionResponse.dto';
import { getCurrentUser, getProfile } from '@/features/user';

export const FETCHING_STATUS_IDLE = 'idle';
export const FETCHING_STATUS_LOADING = 'loading';
export const FETCHING_STATUS_SUCCEEDED = 'succeeded';
export const FETCHING_STATUS_FAILED = 'failed';

export type FetchingStatus =
  | typeof FETCHING_STATUS_IDLE
  | typeof FETCHING_STATUS_LOADING
  | typeof FETCHING_STATUS_SUCCEEDED
  | typeof FETCHING_STATUS_FAILED;

interface UserState {
  id: string;
  email: string;
  firstName?: string;
  username?: string;
  role: string;
  isAdmin: boolean;
  hasCompletedSurvey: boolean;
  language: string;
  subscription?: SubscriptionResponseDtoV2 | null;
  totalCredits?: number;
  usedCredits?: number;
  lastLogin?: Date;
  emailVerified?: boolean;
  isActive?: boolean;
}

interface RoleState {
  user: UserState | null;
  fetchingStatus: FetchingStatus;
  error: string | null;
}

const initialState: RoleState = {
  user: null,
  fetchingStatus: FETCHING_STATUS_IDLE,
  error: null,
};

export const fetchCurrentUser = createAsyncThunk('role/me', async (): Promise<UserState> => {
  const response = await getCurrentUser<UserState>();
  try {
    const profile: any = await getProfile();
    return {
      ...response,
      ...profile,
    };
  } catch (error) {
    console.error('Failed to fetch user profile', error);
    return response;
  }
});

const currentUserSlice = createSlice({
  name: 'roles',
  initialState,
  reducers: {
    setHasCompletedSurvey(state, action: PayloadAction<boolean>) {
      if (state.user) {
        state.user.hasCompletedSurvey = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.fetchingStatus = FETCHING_STATUS_LOADING;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action: PayloadAction<UserState>) => {
        state.fetchingStatus = FETCHING_STATUS_SUCCEEDED;
        state.user = action.payload;
        // state.user.hasCompletedSurvey = true

        // Sync language to i18nextLng
        if (action.payload.language) {
          try {
            // If user manually set language via UI, preserve it and don't overwrite.
            const manual = localStorage.getItem('i18nextLng_manual');
            if (!manual) {
              changeLanguage(action.payload.language);
              localStorage.setItem('i18nextLng', action.payload.language);
            } else {
              // If manual flag present, ensure i18next uses the manual value (no overwrite)
              const manualLng = localStorage.getItem('i18nextLng') || action.payload.language;
              changeLanguage(manualLng);
            }
          } catch {
            // ignore localStorage errors and fall back to server language
            changeLanguage(action.payload.language);
          }
        }
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.fetchingStatus = FETCHING_STATUS_FAILED;
        state.error = action.error.message || 'Unknown error';
      });
  },
});

export const { setHasCompletedSurvey } = currentUserSlice.actions;
export const currentUserReducer = currentUserSlice.reducer;

