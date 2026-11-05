import { configureStore } from '@reduxjs/toolkit';
import playerReducer from './features/playerSlice';
import { veromeApi } from './services/veromeApi';

export const store = configureStore({
  reducer: {
    [veromeApi.reducerPath]: veromeApi.reducer,
    player: playerReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(veromeApi.middleware),
});

export default store;
