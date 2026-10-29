import { configureStore } from '@reduxjs/toolkit';
import bankingReducer from './bankingSlice';

export const store = configureStore({
    reducer: {
        banking: bankingReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;