import { createContext, useContext } from 'react';
import type { StudioOverview } from '@/features/studio/types';

export interface StudioContextValue { overview: StudioOverview | undefined; isLoading: boolean; isError: boolean; refresh: () => Promise<StudioOverview | undefined>; invalidate: () => void; }
export const StudioContext = createContext<StudioContextValue | null>(null);
export function useStudio(): StudioContextValue { const value = useContext(StudioContext); if (!value) throw new Error('[studio] useStudio must be used inside StudioProvider.'); return value; }
