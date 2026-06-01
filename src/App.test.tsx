import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

vi.mock("@/hooks/useToolStatus", () => ({
  useToolStatus: () => ({
    data: [
      ["libreoffice", true],
      ["imagemagick", true],
      ["ghostscript", true]
    ],
    isLoading: false
  })
}));

vi.mock("@/hooks/useToolDownload", () => ({
  useToolDownload: () => ({
    downloadTool: vi.fn(),
    states: {},
    progress: {}
  })
}));

describe("App Smoke Test", () => {
  it("renders the Morphine title", () => {
    render(<App />);
    expect(screen.getByText("morphine")).toBeInTheDocument();
  });
});
