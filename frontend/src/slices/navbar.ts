import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { translate } from '@/translations';


interface NavbarState {
  heading: string;
  allowBack: boolean;
}

const initialState: NavbarState = {
  heading: '',
  allowBack: false,
};

const navbarSlice = createSlice({
  name: 'navbar',
  initialState,
  reducers: {
    setNavbarHeading(state, action: PayloadAction<string>) {
      state.heading = translate(`common:${action.payload.toLocaleLowerCase().replace(/ /g, '_')}`);
    },
    setNavbarAllowBack(state, action: PayloadAction<boolean>) {
      state.allowBack = action.payload;
    },
  },
});

export const { setNavbarHeading, setNavbarAllowBack } = navbarSlice.actions;
export const navbarReducer = navbarSlice.reducer;

