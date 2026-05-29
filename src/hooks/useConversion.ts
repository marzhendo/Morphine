import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useConversionStore } from '@/store/conversionStore';
import type { ConversionJob, ConversionProgress, ConversionResult } from '@/types/conversion';

export function useConversion() {
  const { updateProgress, setResult } = useConversionStore();

  const startConversion = async (job: ConversionJob) => {
    // Listen for progress events
    const unlisten = await listen<ConversionProgress>('conversion:progress', (event) => {
      if (event.payload.jobId === job.id) {
        updateProgress(job.id, event.payload);
      }
    });

    try {
      const result = await invoke<ConversionResult>('convert_docx_to_pdf', { job });
      setResult(job.id, result);
    } finally {
      unlisten();
    }
  };

  return { startConversion };
}
