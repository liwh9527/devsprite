import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionSwitcher } from "./SessionSwitcher";
import { useAppStore } from "../stores/appStore";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

const makeSession = (id: string, permissionRequests: any[] = []) => ({
  sessionId: id,
  status: "idle" as const,
  statusMessage: "",
  toolCalls: [],
  permissionRequests,
  lastActive: Date.now(),
});

describe("SessionSwitcher", () => {
  beforeEach(() => {
    useAppStore.setState({
      sessions: new Map(),
      activeSessionId: null,
      pendingResponses: [],
    });
  });

  it("should not render when there are no sessions", () => {
    const { container } = render(<SessionSwitcher />);
    expect(container.innerHTML).toBe("");
  });

  it("should not render when there is only one session", () => {
    const sessions = new Map();
    sessions.set("aaaa-bbbb-cccc", makeSession("aaaa-bbbb-cccc"));
    useAppStore.setState({ sessions, activeSessionId: "aaaa-bbbb-cccc" });

    const { container } = render(<SessionSwitcher />);
    expect(container.innerHTML).toBe("");
  });

  it("should render session buttons when there are multiple sessions", () => {
    const sessions = new Map();
    sessions.set("aaaa-bbbb-1111", makeSession("aaaa-bbbb-1111"));
    sessions.set("cccc-dddd-2222", makeSession("cccc-dddd-2222"));
    useAppStore.setState({ sessions, activeSessionId: "aaaa-bbbb-1111" });

    render(<SessionSwitcher />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toContain("aaaa-bbb");
    expect(buttons[1].textContent).toContain("cccc-ddd");
  });

  it("should highlight the active session with blue styling", () => {
    const sessions = new Map();
    sessions.set("aaaa-bbbb-1111", makeSession("aaaa-bbbb-1111"));
    sessions.set("cccc-dddd-2222", makeSession("cccc-dddd-2222"));
    useAppStore.setState({ sessions, activeSessionId: "aaaa-bbbb-1111" });

    render(<SessionSwitcher />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0].className).toContain("bg-blue-100");
  });

  it("should style inactive sessions with gray", () => {
    const sessions = new Map();
    sessions.set("aaaa-bbbb-1111", makeSession("aaaa-bbbb-1111"));
    sessions.set("cccc-dddd-2222", makeSession("cccc-dddd-2222"));
    useAppStore.setState({ sessions, activeSessionId: "aaaa-bbbb-1111" });

    render(<SessionSwitcher />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[1].className).toContain("bg-gray-100");
  });

  it("should show red dot on inactive session with permission requests", () => {
    const permRequest = {
      id: "perm-1",
      operation: "Read",
      target: "/file.rs",
      reason: "test",
      timestamp: Date.now(),
      sessionId: "cccc-dddd-2222",
    };
    const sessions = new Map();
    sessions.set("aaaa-bbbb-1111", makeSession("aaaa-bbbb-1111"));
    sessions.set("cccc-dddd-2222", makeSession("cccc-dddd-2222", [permRequest]));
    useAppStore.setState({ sessions, activeSessionId: "aaaa-bbbb-1111" });

    render(<SessionSwitcher />);
    const buttons = screen.getAllByRole("button");
    const inactiveButton = buttons[1];
    expect(inactiveButton.querySelector(".bg-red-500")).toBeInTheDocument();
  });

  it("should not show red dot on active session even with permission requests", () => {
    const permRequest = {
      id: "perm-1",
      operation: "Read",
      target: "/file.rs",
      reason: "test",
      timestamp: Date.now(),
      sessionId: "aaaa-bbbb-1111",
    };
    const sessions = new Map();
    sessions.set("aaaa-bbbb-1111", makeSession("aaaa-bbbb-1111", [permRequest]));
    sessions.set("cccc-dddd-2222", makeSession("cccc-dddd-2222"));
    useAppStore.setState({ sessions, activeSessionId: "aaaa-bbbb-1111" });

    render(<SessionSwitcher />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0].querySelector(".bg-red-500")).toBeNull();
  });

  it("should call setActiveSession when clicking a session button", () => {
    const spy = vi.spyOn(useAppStore.getState(), "setActiveSession");
    const sessions = new Map();
    sessions.set("aaaa-bbbb-1111", makeSession("aaaa-bbbb-1111"));
    sessions.set("cccc-dddd-2222", makeSession("cccc-dddd-2222"));
    useAppStore.setState({ sessions, activeSessionId: "aaaa-bbbb-1111" });

    render(<SessionSwitcher />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);
    expect(spy).toHaveBeenCalledWith("cccc-dddd-2222");
    spy.mockRestore();
  });
});
