import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatHistory } from "./ChatHistory";
import type { ChatMessage } from "../types";

describe("ChatHistory", () => {
  it("should return null when no messages", () => {
    const { container } = render(<ChatHistory messages={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render user messages right-aligned", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "Hello", timestamp: Date.now() },
    ];
    render(<ChatHistory messages={messages} />);
    expect(screen.getByText("Hello")).toBeDefined();
    // The parent div should have justify-end
    const msgContainer = screen.getByText("Hello").closest("[class*='justify-end']");
    expect(msgContainer).not.toBeNull();
  });

  it("should render AI messages left-aligned", () => {
    const messages: ChatMessage[] = [
      { role: "assistant", content: "Hi there!", timestamp: Date.now() },
    ];
    render(<ChatHistory messages={messages} />);
    expect(screen.getByText("Hi there!")).toBeDefined();
    const msgContainer = screen.getByText("Hi there!").closest("[class*='justify-start']");
    expect(msgContainer).not.toBeNull();
  });

  it("should only show the most recent messages up to maxMessages", () => {
    const messages: ChatMessage[] = Array.from({ length: 8 }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `Message ${i}`,
      timestamp: Date.now() + i,
    }));
    render(<ChatHistory messages={messages} maxMessages={5} />);
    // First 3 should not be visible
    expect(screen.queryByText("Message 0")).toBeNull();
    expect(screen.queryByText("Message 1")).toBeNull();
    expect(screen.queryByText("Message 2")).toBeNull();
    // Last 5 should be visible
    expect(screen.getByText("Message 3")).toBeDefined();
    expect(screen.getByText("Message 7")).toBeDefined();
  });

  it("should render all messages when count is within limit", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "msg1", timestamp: Date.now() },
      { role: "assistant", content: "msg2", timestamp: Date.now() + 1 },
    ];
    render(<ChatHistory messages={messages} />);
    expect(screen.getByText("msg1")).toBeDefined();
    expect(screen.getByText("msg2")).toBeDefined();
  });
});
