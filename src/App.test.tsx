import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App Smoke Test", () => {
  it("renders the Morphine title", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /Morphine/i })).toBeInTheDocument();
  });
});
