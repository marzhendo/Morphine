import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@tauri-apps/plugin-shell", () => ({
  open: vi.fn(() => Promise.resolve()),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openPath: vi.fn(() => Promise.resolve()),
}));

// Mock Tool Status queries globally to prevent react-query boundary failures in JSDOM tests
vi.mock("@/hooks/useToolStatus", () => ({
  useToolStatus: vi.fn(() => ({
    data: [
      ["libreoffice", true],
      ["imagemagick", true],
      ["ghostscript", true],
    ],
    isLoading: false,
  })),
  useIsLibreOfficeReady: vi.fn(() => true),
}));
