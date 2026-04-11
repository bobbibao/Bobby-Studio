import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  isLoggedIn: boolean;
}

const initialState: AuthState = {
  isLoggedIn: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setIsLogged(state, action: PayloadAction<boolean>) {
      state.isLoggedIn = action.payload;

      if (!action.payload) {
        localStorage.removeItem('accessToken');
      }
    },
  },
});

export const { setIsLogged } = authSlice.actions;
export const authReducer = authSlice.reducer;

