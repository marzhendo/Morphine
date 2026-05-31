import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueueItem } from "./QueueItem";
import type { ConversionJob } from "@/types/conversion";

vi.mock("@/hooks/useConversion", () => ({
  useConversion: () => ({
    startConversion:  vi.fn(),
    cancelConversion: vi.fn(),
    openOutputFile:   vi.fn(),
  }),
}));

function makeJob(overrides: Partial<ConversionJob> = {}): ConversionJob {
  return {
    id:           "test-id",
    inputPath:    "C:\\Users\\test\\document.docx",
    outputPath:   "C:\\Users\\test\\document.pdf",
    inputFormat:  "docx",
    outputFormat: "pdf",
    engine:       "libreoffice",
    status:       "idle",
    progress:     0,
    message:      "",
    createdAt:    Date.now(),
    ...overrides,
  };
}

describe("QueueItem Component Tests", () => {
  it("Idle state — renders filename, shows Convert button, shows FormatSelector", () => {
    const job = makeJob({ status: "idle" });
    render(<QueueItem job={job} onRemove={vi.fn()} />);

    expect(screen.getByText("document.docx")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Convert/i })).toBeInTheDocument();
    // Verify format buttons exist (e.g. PDF selection)
    expect(screen.getByRole("button", { name: "PDF" })).toBeInTheDocument();
  });

  it("Converting state — renders filename, shows progress bar, shows Cancel button, does NOT show Convert", () => {
    const job = makeJob({ status: "converting", progress: 45 });
    render(<QueueItem job={job} onRemove={vi.fn()} />);

    expect(screen.getByText("document.docx")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Convert/i })).not.toBeInTheDocument();
  });

  it("Done state — renders filename, shows Open button, does NOT show Convert", () => {
    const job = makeJob({ status: "done" });
    render(<QueueItem job={job} onRemove={vi.fn()} />);

    expect(screen.getByText("document.docx")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Convert/i })).not.toBeInTheDocument();
  });

  it("Error state — renders filename, shows error message, shows Retry button", () => {
    const job = makeJob({ status: "error", error: "Conversion failed" });
    render(<QueueItem job={job} onRemove={vi.fn()} />);

    expect(screen.getByText("document.docx")).toBeInTheDocument();
    expect(screen.getByText("Conversion failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
  });
});
