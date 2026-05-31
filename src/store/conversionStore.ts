import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  ConversionJob,
  ConversionProgressEvent,
  ConversionResultPayload,
  JobStatus,
} from "@/types/conversion";

interface ConversionState {
  jobs: ConversionJob[];

  addJob:         (job: ConversionJob) => void;
  updateProgress: (event: ConversionProgressEvent) => void;
  setResult:      (result: ConversionResultPayload) => void;
  setStatus:      (jobId: string, status: JobStatus) => void;
  removeJob:      (jobId: string) => void;
  clearCompleted: () => void;
  clearAll:       () => void;

  activeCount:    () => number;
  completedCount: () => number;
  errorCount:     () => number;
}

export const useConversionStore = create<ConversionState>()(
  devtools(
    (set, get) => ({
      jobs: [],

      addJob: (job) =>
        set((state) => ({ jobs: [...state.jobs, job] })),

      updateProgress: (event) =>
        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.id === event.job_id
              ? { ...j, progress: event.percent, message: event.message, status: "converting" }
              : j
          ),
        })),

      setResult: (result) =>
        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.id === result.job_id
              ? {
                  ...j,
                  status:      result.success ? "done" : "error",
                  progress:    result.success ? 100 : j.progress,
                  outputPath:  result.output_path ?? j.outputPath,
                  error:       result.error,
                  completedAt: Date.now(),
                }
              : j
          ),
        })),

      setStatus: (jobId, status) =>
        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.id === jobId ? { ...j, status } : j
          ),
        })),

      removeJob: (jobId) =>
        set((state) => ({ jobs: state.jobs.filter((j) => j.id !== jobId) })),

      clearCompleted: () =>
        set((state) => ({
          jobs: state.jobs.filter((j) => j.status !== "done"),
        })),

      clearAll: () => set({ jobs: [] }),

      activeCount: () =>
        get().jobs.filter((j) =>
          j.status === "queued" || j.status === "converting"
        ).length,

      completedCount: () =>
        get().jobs.filter((j) => j.status === "done").length,

      errorCount: () =>
        get().jobs.filter((j) => j.status === "error").length,
    }),
    { name: "morphine-conversions" }
  )
);
