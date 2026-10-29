import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface BankingState {
    pendingConsentId: string | null;
    error: string | null;
}

const initialState: BankingState = {
    pendingConsentId: null,
    error: null,
};

const bankingSlice = createSlice({
    name: 'banking',
    initialState,
    reducers: {
        setPendingConsentId: (state, action: PayloadAction<string | null>) => {
            state.pendingConsentId = action.payload;
        },
        clearPendingConsentId: (state) => {
            state.pendingConsentId = null;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
    },
});

export const { setPendingConsentId, clearPendingConsentId, setError } = bankingSlice.actions;

export default bankingSlice.reducer;