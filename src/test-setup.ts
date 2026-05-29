import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Tauri APIs globally for the test environment (JSDOM)
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue("Mocked Greet"),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));
