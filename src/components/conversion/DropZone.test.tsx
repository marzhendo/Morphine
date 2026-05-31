import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DropZone } from "./DropZone";

describe("DropZone Component Tests", () => {
  it("Renders without crashing — basic smoke test", () => {
    const handleFilesDropped = vi.fn();
    render(<DropZone onFilesDropped={handleFilesDropped} />);
    
    expect(screen.getByText(/Drop files here/i)).toBeInTheDocument();
  });

  it("Renders correctly — shows drop instruction text and supported format list", () => {
    const handleFilesDropped = vi.fn();
    render(<DropZone onFilesDropped={handleFilesDropped} />);

    expect(screen.getByText(/Drop files here/i)).toBeInTheDocument();
    expect(screen.getByText(/DOCX · PDF · XLSX · PPTX · JPG · PNG · WEBP · BMP/i)).toBeInTheDocument();
  });
});
