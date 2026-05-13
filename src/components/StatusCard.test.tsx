import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusCard } from "./StatusCard";

describe("StatusCard", () => {
  it("should display idle label", () => {
    render(<StatusCard status="idle" message="" />);
    expect(screen.getByText("空闲...")).toBeInTheDocument();
  });

  it("should display working label", () => {
    render(<StatusCard status="working" message="" />);
    expect(screen.getByText("工作中...")).toBeInTheDocument();
  });

  it("should display status message", () => {
    render(<StatusCard status="active" message="执行 Grep" />);
    expect(screen.getByText("执行 Grep")).toBeInTheDocument();
  });

  it("should not display message when empty", () => {
    const { container } = render(<StatusCard status="idle" message="" />);
    const messageEl = container.querySelector(".text-gray-500");
    expect(messageEl).toBeNull();
  });
});
