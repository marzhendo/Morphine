import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import { v4 as uuidv4 } from "uuid";
import { useConversionStore } from "@/store/conversionStore";
import type {
  ConversionJob,
  FileFormat,
} from "@/types/conversion";
import { detectFormat, resolveOutputPath, getEngine } from "@/lib/formatUtils";
import { useSettingsStore } from "@/store/settingsStore";

export function useConversion() {
  const { addJob, setStatus, removeJob } = useConversionStore();
  const { settings } = useSettingsStore();

  const startConversion = useCallback(
    async (inputPath: string, outputFormat: FileFormat) => {
      // Duplication Guard: Hapus job idle/error yang ada sebelumnya dengan inputPath yang sama
      const existingJob = useConversionStore.getState().jobs.find(
        (j) => j.inputPath === inputPath && (j.status === "idle" || j.status === "error")
      );
      if (existingJob) {
        removeJob(existingJob.id);
      }

      const id          = uuidv4();
      const inputFormat = detectFormat(inputPath);
      const outputDir = settings.defaultOutputDir === "custom" && settings.customOutputDir
        ? settings.customOutputDir
        : undefined;
      const outputPath  = resolveOutputPath(inputPath, outputFormat, outputDir);
      const engine      = getEngine(inputFormat, outputFormat);

      const { jobs } = useConversionStore.getState();
      const activeCount = jobs.filter(
        (j) => j.status === "converting" || j.status === "queued"
      ).length;
      const { concurrentJobs } = settings;

      const job: ConversionJob = {
        id,
        inputPath,
        outputPath,
        inputFormat,
        outputFormat,
        engine,
        status:    "queued",
        progress:  0,
        message:   activeCount >= concurrentJobs ? "waiting for slot..." : "queued",
        createdAt: Date.now(),
      };
      addJob(job);
    },
    [addJob, removeJob, settings]
  );

  const cancelConversion = useCallback(
    async (jobId: string) => {
      try {
        await invoke("cancel_conversion", { jobId });
        setStatus(jobId, "cancelled");
      } catch {
        // Job may have already finished — safe to ignore
      }
    },
    [setStatus]
  );

  const openOutputFile = useCallback(async (outputPath: string) => {
    await openPath(outputPath);
  }, []);

  return { startConversion, cancelConversion, openOutputFile };
}
