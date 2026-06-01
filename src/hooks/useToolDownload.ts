import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useQueryClient } from "@tanstack/react-query";

export interface ToolDownloadProgress {
  tool:        string;
  percent:     number;
  message:     string;
  bytes_done:  number;
  bytes_total: number;
}

export type DownloadState = "idle" | "downloading" | "done" | "error";

export function useToolDownload() {
  const queryClient = useQueryClient();
  const [states, setStates] = useState<Record<string, DownloadState>>({});
  const [progress, setProgress] = useState<Record<string, ToolDownloadProgress>>({});

  const downloadTool = useCallback(async (toolName: string) => {
    setStates((s) => ({ ...s, [toolName]: "downloading" }));

    const unlisten = await listen<ToolDownloadProgress>(
      "tool:download-progress",
      (event) => {
        if (event.payload.tool === toolName) {
          setProgress((p) => ({ ...p, [toolName]: event.payload }));
        }
      }
    );

    try {
      await invoke("download_tool", { toolName });
      setStates((s) => ({ ...s, [toolName]: "done" }));
      // Refresh tool status setelah install selesai
      queryClient.invalidateQueries({ queryKey: ["tool-status"] });
    } catch (err) {
      setStates((s) => ({ ...s, [toolName]: "error" }));
    } finally {
      unlisten();
    }
  }, [queryClient]);

  return { downloadTool, states, progress };
}
