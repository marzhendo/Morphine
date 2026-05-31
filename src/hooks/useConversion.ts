import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openPath } from "@tauri-apps/plugin-opener";
import { v4 as uuidv4 } from "uuid";
import { useConversionStore } from "@/store/conversionStore";
import type {
  ConversionJob,
  ConversionJobPayload,
  ConversionProgressEvent,
  ConversionResultPayload,
  FileFormat,
} from "@/types/conversion";
import { detectFormat, resolveOutputPath, getEngine } from "@/lib/formatUtils";
import { useSettingsStore } from "@/store/settingsStore";

export function useConversion() {
  const { addJob, updateProgress, setResult, setStatus } = useConversionStore();
  const { settings } = useSettingsStore();

  const startConversion = useCallback(
    async (inputPath: string, outputFormat: FileFormat) => {
      const id          = uuidv4();
      const inputFormat = detectFormat(inputPath);
      const outputDir = settings.defaultOutputDir === "custom" && settings.customOutputDir
        ? settings.customOutputDir
        : undefined;
      const outputPath  = resolveOutputPath(inputPath, outputFormat, outputDir);
      const engine      = getEngine(inputFormat, outputFormat);

      const job: ConversionJob = {
        id,
        inputPath,
        outputPath,
        inputFormat,
        outputFormat,
        engine,
        status:    "queued",
        progress:  0,
        message:   "Waiting...",
        createdAt: Date.now(),
      };
      addJob(job);

      const unlisten = await listen<ConversionProgressEvent>(
        "conversion:progress",
        (event) => {
          if (event.payload.job_id === id) {
            updateProgress(event.payload);
          }
        }
      );

      try {
        setStatus(id, "converting");

        const payload: ConversionJobPayload = {
          id,
          input_path:    inputPath,
          output_path:   outputPath,
          input_format:  inputFormat,
          output_format: outputFormat,
        };

        const result = await invoke<ConversionResultPayload>("convert_file", {
          job: payload,
        });

        setResult(result);
      } catch (err) {
        setResult({
          job_id:  id,
          success: false,
          error:   err instanceof Error ? err.message : String(err),
        });
      } finally {
        unlisten();
      }
    },
    [addJob, updateProgress, setResult, setStatus, settings]
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
