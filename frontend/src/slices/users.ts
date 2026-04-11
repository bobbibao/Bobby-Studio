import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../types/auth';
interface UserState {
  userId: string;
  userProfile: User | null;
}

const initialState: UserState = {
  userId: '',
  userProfile: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserId(state, action: PayloadAction<string>) {
      state.userId = action.payload;
    },
    setUserProfile(state, action: PayloadAction<User | null>) {
      state.userProfile = action.payload;
    },
    resetUserStore(state) {
      state.userProfile = null;
      state.userId = '';
    },
  },
});

export const { setUserId, setUserProfile, resetUserStore } = userSlice.actions;
export const userReducer = userSlice.reducer;

