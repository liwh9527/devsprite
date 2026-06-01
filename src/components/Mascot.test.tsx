import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Mascot } from "./Mascot";

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

  it("should apply mascot-idle animation class when status is idle", () => {
    render(<Mascot status="idle" />);
    const img = screen.getByAltText("DevSprite mascot");
    expect(img.parentElement?.className).toContain("mascot-idle");
  });

  it("should apply mascot-active animation class when status is active", () => {
    render(<Mascot status="active" />);
    const img = screen.getByAltText("DevSprite mascot");
    expect(img.parentElement?.className).toContain("mascot-active");
  });

  it("should apply mascot-waiting animation class when status is waiting", () => {
    render(<Mascot status="waiting" />);
    const img = screen.getByAltText("DevSprite mascot");
    expect(img.parentElement?.className).toContain("mascot-waiting");
  });

  it("should apply mascot-working animation class when status is working", () => {
    render(<Mascot status="working" />);
    const img = screen.getByAltText("DevSprite mascot");
    expect(img.parentElement?.className).toContain("mascot-working");
  });

  it("should apply mascot-error animation class when status is error", () => {
    render(<Mascot status="error" />);
    const img = screen.getByAltText("DevSprite mascot");
    expect(img.parentElement?.className).toContain("mascot-error");
  });
});
