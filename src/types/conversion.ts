// ─── File Formats ─────────────────────────────────────────────────────────────

export type DocumentFormat = "docx" | "xlsx" | "pptx" | "pdf";
export type ImageFormat    = "jpg" | "jpeg" | "png" | "webp" | "bmp";
export type FileFormat     = DocumentFormat | ImageFormat;

export type ConversionEngine = "libreoffice" | "imagemagick" | "ghostscript";

// ─── Conversion Job ───────────────────────────────────────────────────────────

export type JobStatus =
  | "idle"
  | "queued"
  | "converting"
  | "done"
  | "error"
  | "cancelled";

export interface ConversionJob {
  id: string;
  inputPath: string;
  outputPath: string;
  inputFormat: FileFormat;
  outputFormat: FileFormat;
  engine: ConversionEngine;
  status: JobStatus;
  progress: number;       // 0–100
  message: string;
  error?: string;
  createdAt: number;      // Date.now()
  completedAt?: number;
}

// ─── IPC Payloads (mirror Rust structs exactly) ───────────────────────────────

export interface ConversionJobPayload {
  id: string;
  input_path: string;
  output_path: string;
  input_format: FileFormat;
  output_format: FileFormat;
}

export interface ConversionProgressEvent {
  job_id: string;
  percent: number;
  message: string;
}

export interface ConversionResultPayload {
  job_id: string;
  success: boolean;
  output_path?: string;
  error?: string;
}

// ─── Tool Registry ────────────────────────────────────────────────────────────

export type ToolName = "libreoffice" | "imagemagick" | "ghostscript";
export type ToolStatus = "not_found" | "downloading" | "ready" | "error";

export interface Tool {
  name: ToolName;
  status: ToolStatus;
  version?: string;
  path?: string;
  downloadProgress?: number;
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  defaultOutputDir: "same_as_input" | "custom";
  customOutputDir?: string;
  outputNaming: "overwrite" | "suffix_number" | "suffix_timestamp";
  imageQuality: number;
  concurrentJobs: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultOutputDir: "same_as_input",
  outputNaming: "suffix_number",
  imageQuality: 90,
  concurrentJobs: 2,
};
