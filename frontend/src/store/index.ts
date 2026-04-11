// store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { loadingReducer } from '../slices/loading';
import { editorConfigsReducer } from '../slices/editorConfigs';
import { userReducer } from '../slices/users';
import { authReducer } from '../slices/auth';
import toastReducer from '../slices/toastSlice';
import { navbarReducer } from '../slices/navbar';
import { projectManagement } from '../reducers/project';
import { currentUserReducer } from '../slices/currentUserSlice';
import surveyFormReducer from '../slices/formSlice';
import { cmsReducer } from '../slices/cms';
import inspiration from '../reducers/inspiration';
import { canvasReducer } from '../slices/canvasSlice';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { modelsReducer } from '../slices/models';

// Redux Persist configuration
const editorConfigsPersistConfig = {
  key: 'editorConfigs',
  storage,
};

const userPersistConfig = {
  key: 'user',
  storage,
};

const authPersistConfig = {
  key: 'auth',
  storage,
};

const canvasPersistConfig = {
  key: 'canvas',
  storage,
};

// Apply persistence
const persistedEditorConfigsReducer = persistReducer(editorConfigsPersistConfig, editorConfigsReducer);

const persistedUserReducer = persistReducer(userPersistConfig, userReducer);

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);

const persistedCanvasReducer = persistReducer(canvasPersistConfig, canvasReducer);

const store = configureStore({
  reducer: {
    loading: loadingReducer,
    editorConfigs: persistedEditorConfigsReducer,
    user: persistedUserReducer,
    auth: persistedAuthReducer,
    navbar: navbarReducer,
    projectManagement,
    currentUser: currentUserReducer,
    survey: surveyFormReducer,
    cms: cmsReducer,
    inspiration,
    canvas: persistedCanvasReducer,
    toast: toastReducer,
    models: modelsReducer,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppDispatchRaw: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;

