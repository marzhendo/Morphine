export interface ConversionJob {
  id: string;
  inputPath: string;
  outputPath: string;
  inputFormat: string;
  outputFormat: string;
}

export interface ConversionProgress {
  jobId: string;
  percent: number;
  message: string;
}

export interface ConversionResult {
  jobId: string;
  success: boolean;
  outputPath?: string;
  error?: string;
}
