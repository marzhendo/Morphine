import { useEffect, useRef } from "react";
import { useConversionStore } from "@/store/conversionStore";
import { useSettingsStore } from "@/store/settingsStore";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  ConversionJobPayload,
  ConversionProgressEvent,
  ConversionResultPayload,
} from "@/types/conversion";

export function useQueue() {
  const { jobs, setStatus, updateProgress, setResult } = useConversionStore();
  const { settings } = useSettingsStore();
  const processingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const activeCount = jobs.filter((j) => j.status === "converting").length;

    const availableSlots = settings.concurrentJobs - activeCount;
    if (availableSlots <= 0) return;

    // Ambil job queued tertua yang belum sedang diproses
    const pendingJobs = jobs
      .filter((j) => j.status === "queued" && !processingRef.current.has(j.id))
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, availableSlots);

    for (const job of pendingJobs) {
      processingRef.current.add(job.id);
      runJob(job.id);
    }

    async function runJob(jobId: string) {
      const job = useConversionStore.getState().jobs.find((j) => j.id === jobId);
      if (!job) return;

      const unlisten = await listen<ConversionProgressEvent>(
        "conversion:progress",
        (event) => {
          if (event.payload.job_id === jobId) {
            updateProgress(event.payload);
          }
        }
      );

      try {
        setStatus(jobId, "converting");

        const payload: ConversionJobPayload = {
          id:            job.id,
          input_path:    job.inputPath,
          output_path:   job.outputPath,
          input_format:  job.inputFormat,
          output_format: job.outputFormat,
        };

        const result = await invoke<ConversionResultPayload>("convert_file", {
          job: payload,
        });

        // Cancellation Guard: Hanya panggil setResult jika job belum dibatalkan
        const currentJob = useConversionStore.getState().jobs.find((j) => j.id === jobId);
        if (currentJob && currentJob.status !== "cancelled") {
          setResult(result);
        }
      } catch (err) {
        // Cancellation Guard: Hanya panggil setResult jika job belum dibatalkan
        const currentJob = useConversionStore.getState().jobs.find((j) => j.id === jobId);
        if (currentJob && currentJob.status !== "cancelled") {
          setResult({
            job_id:  jobId,
            success: false,
            error:   err instanceof Error ? err.message : String(err),
          });
        }
      } finally {
        unlisten();
        processingRef.current.delete(jobId);
      }
    }
  }, [jobs, settings.concurrentJobs, setStatus, updateProgress, setResult]);
}
