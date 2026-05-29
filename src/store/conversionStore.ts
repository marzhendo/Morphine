import { create } from 'zustand';
import type { ConversionJob, ConversionProgress, ConversionResult } from '../types/conversion';

interface ConversionState {
  queue: ConversionJob[];
  progress: Record<string, ConversionProgress>;
  results: Record<string, ConversionResult>;
  addToQueue: (job: ConversionJob) => void;
  updateProgress: (jobId: string, progress: ConversionProgress) => void;
  setResult: (jobId: string, result: ConversionResult) => void;
  clearQueue: () => void;
}

export const useConversionStore = create<ConversionState>((set) => ({
  queue: [],
  progress: {},
  results: {},
  addToQueue: (job) => set((state) => ({ queue: [...state.queue, job] })),
  updateProgress: (jobId, progress) => set((state) => ({
    progress: { ...state.progress, [jobId]: progress }
  })),
  setResult: (jobId, result) => set((state) => ({
    results: { ...state.results, [jobId]: result }
  })),
  clearQueue: () => set({ queue: [], progress: {}, results: {} }),
}));
