import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface FormState {
  step: number;
  data: Record<string, any>;
  completed: boolean;
}

const initialState: FormState = {
  step: 0,
  data: {},
  completed: false,
};

const formSlice = createSlice({
  name: "form",
  initialState,
  reducers: {
    setStep(state, action: PayloadAction<number>) {
      state.step = action.payload;
    },
    updateFormData(state, action: PayloadAction<Record<string, any>>) {
      state.data = { ...state.data, ...action.payload };
    },
    setCompleted(state, action: PayloadAction<boolean>) {
      state.completed = action.payload;
    },
    resetForm(state) {
      state.step = 0;
      state.data = {};
      state.completed = false;
    },
  },
});

export const { setStep, updateFormData, setCompleted, resetForm } =
  formSlice.actions;
export default formSlice.reducer;

