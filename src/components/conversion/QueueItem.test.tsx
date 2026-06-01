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
  it("Idle state — renders filename, shows run → button, shows FormatSelector", () => {
    const job = makeJob({ status: "idle" });
    render(<QueueItem job={job} onRemove={vi.fn()} />);

    expect(screen.getByText("document.docx")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run/i })).toBeInTheDocument();
    // Verify format buttons exist (e.g. PDF selection)
    expect(screen.getByRole("button", { name: "pdf" })).toBeInTheDocument();
  });

  it("Converting state — renders filename, shows progress bar, shows cancel button, does NOT show run →", () => {
    const job = makeJob({ status: "converting", progress: 45 });
    render(<QueueItem job={job} onRemove={vi.fn()} />);

    expect(screen.getByText("document.docx")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /run/i })).not.toBeInTheDocument();
  });

  it("Done state — renders filename, shows open button, does NOT show run →", () => {
    const job = makeJob({ status: "done" });
    render(<QueueItem job={job} onRemove={vi.fn()} />);

    expect(screen.getByText("document.docx")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /run/i })).not.toBeInTheDocument();
  });

  it("Error state — renders filename, shows error message, shows retry button", () => {
    const job = makeJob({ status: "error", error: "Conversion failed" });
    render(<QueueItem job={job} onRemove={vi.fn()} />);

    expect(screen.getByText("document.docx")).toBeInTheDocument();
    expect(screen.getByText(/Conversion failed/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("Queued state — renders filename, shows waiting message, shows queued badge, shows cancel button", () => {
    const job = makeJob({ status: "queued" });
    render(<QueueItem job={job} onRemove={vi.fn()} />);

    expect(screen.getByText("document.docx")).toBeInTheDocument();
    expect(screen.getByText("waiting for slot...")).toBeInTheDocument();
    expect(screen.getByText(/queued/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /run/i })).not.toBeInTheDocument();
  });
});
