import type { ConversionEngine, FileFormat } from "@/types/conversion";

export function detectFormat(filePath: string): FileFormat {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const formatMap: Record<string, FileFormat> = {
    docx: "docx", xlsx: "xlsx", pptx: "pptx", pdf: "pdf",
    jpg: "jpg", jpeg: "jpg", png: "png", webp: "webp", bmp: "bmp",
  };
  const format = formatMap[ext];
  if (!format) throw new Error(`Unsupported format: .${ext}`);
  return format;
}

export function resolveOutputPath(
  inputPath: string,
  outputFormat: FileFormat,
  customDir?: string
): string {
  const lastDot   = inputPath.lastIndexOf(".");
  const lastSlash = Math.max(inputPath.lastIndexOf("\\"), inputPath.lastIndexOf("/"));
  const dir       = customDir ?? inputPath.substring(0, lastSlash);
  const baseName  = inputPath.substring(lastSlash + 1, lastDot);
  const ext       = outputFormat === "jpg" ? "jpg" : outputFormat;
  return `${dir}\\${baseName}.${ext}`;
}

export function getEngine(inputFormat: FileFormat, outputFormat: FileFormat): ConversionEngine {
  if (inputFormat === "pdf" && isImageFormat(outputFormat)) return "ghostscript";
  if (isImageFormat(inputFormat)) return "imagemagick";
  return "libreoffice";
}

export function isImageFormat(format: FileFormat): boolean {
  return ["jpg", "jpeg", "png", "webp", "bmp"].includes(format);
}

export function isDocumentFormat(format: FileFormat): boolean {
  return ["docx", "xlsx", "pptx", "pdf"].includes(format);
}

const CONVERSION_MAP: Record<FileFormat, FileFormat[]> = {
  docx: ["pdf"], xlsx: ["pdf"], pptx: ["pdf"],
  pdf:  ["docx", "jpg", "png"],
  jpg:  ["png", "webp", "bmp", "pdf"], jpeg: ["png", "webp", "bmp", "pdf"],
  png:  ["jpg", "webp", "bmp", "pdf"], webp: ["jpg", "png", "bmp", "pdf"],
  bmp:  ["jpg", "png", "webp", "pdf"],
};

export function getAllowedOutputFormats(inputFormat: FileFormat): FileFormat[] {
  return CONVERSION_MAP[inputFormat] ?? [];
}

export function formatLabel(format: FileFormat): string {
  return format.toUpperCase();
}

export function fileSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
