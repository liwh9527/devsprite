import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToolList } from "./ToolList";
import type { ToolCall } from "../types";

describe("ToolList", () => {
  it("should show empty message when no tool calls", () => {
    render(<ToolList toolCalls={[]} />);
    expect(screen.getByText("暂无工具调用记录")).toBeInTheDocument();
  });

  it("should display tool names", () => {
    const toolCalls: ToolCall[] = [
      { id: "1", toolName: "Read", target: "/file.rs", status: "completed", timestamp: Date.now() - 5000 },
      { id: "2", toolName: "Grep", target: "/src", status: "completed", timestamp: Date.now() - 10000 },
    ];
    render(<ToolList toolCalls={toolCalls} />);
    expect(screen.getByText("Read")).toBeInTheDocument();
    expect(screen.getByText("Grep")).toBeInTheDocument();
  });

  it("should render at most 5 tool calls by default", () => {
    const toolCalls: ToolCall[] = Array.from({ length: 8 }, (_, i) => ({
      id: String(i),
      toolName: `Tool${i}`,
      target: `/path/${i}`,
      status: "completed" as const,
      timestamp: Date.now() - i * 1000,
    }));
    render(<ToolList toolCalls={toolCalls} />);
    expect(screen.getByText("Tool0")).toBeInTheDocument();
    expect(screen.getByText("Tool4")).toBeInTheDocument();
    expect(screen.queryByText("Tool5")).toBeNull();
  });

  it("should respect maxToolCalls prop", () => {
    const toolCalls: ToolCall[] = Array.from({ length: 8 }, (_, i) => ({
      id: String(i),
      toolName: `Tool${i}`,
      target: `/path/${i}`,
      status: "completed" as const,
      timestamp: Date.now() - i * 1000,
    }));
    render(<ToolList toolCalls={toolCalls} maxToolCalls={3} />);
    expect(screen.getByText("Tool0")).toBeInTheDocument();
    expect(screen.getByText("Tool2")).toBeInTheDocument();
    expect(screen.queryByText("Tool3")).toBeNull();
  });
});
