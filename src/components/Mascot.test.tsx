import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Mascot } from "./Mascot";

// Mock image imports
vi.mock("../assets/mascot/idle.png", () => ({ default: "/idle.png" }));
vi.mock("../assets/mascot/active.png", () => ({ default: "/active.png" }));
vi.mock("../assets/mascot/working.png", () => ({ default: "/working.png" }));
vi.mock("../assets/mascot/waiting.png", () => ({ default: "/waiting.png" }));
vi.mock("../assets/mascot/error.png", () => ({ default: "/error.png" }));

describe("Mascot", () => {
  it("should render idle image when status is idle", () => {
    render(<Mascot status="idle" />);
    const img = screen.getByAltText("DevSprite mascot") as HTMLImageElement;
    expect(img.src).toContain("idle.png");
  });

  it("should render working image when status is working", () => {
    render(<Mascot status="working" />);
    const img = screen.getByAltText("DevSprite mascot") as HTMLImageElement;
    expect(img.src).toContain("working.png");
  });

  it("should apply bounce animation when status is waiting", () => {
    render(<Mascot status="waiting" />);
    const img = screen.getByAltText("DevSprite mascot");
    expect(img.className).toContain("animate-bounce");
  });

  it("should apply pulse animation when status is active", () => {
    render(<Mascot status="active" />);
    const img = screen.getByAltText("DevSprite mascot");
    expect(img.className).toContain("animate-pulse-slow");
  });
});
