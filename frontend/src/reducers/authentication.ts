import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IAuthState } from "../types/auth";



const initialState: IAuthState = {
    user: undefined,
};


export const authenticationSlice = createSlice({
    name: 'authentication',
    initialState,
    reducers: {
    },
  });
  
  const { actions, reducer } = authenticationSlice;
  export const authentication = authenticationSlice.reducer;
  

