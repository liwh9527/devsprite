import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAppStore, getActiveSession } from "./appStore";
import type { ToolCall, PermissionRequest } from "../types";

// Mock @tauri-apps/api/core
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";

const mockInvoke = invoke as ReturnType<typeof vi.fn>;

const defaultSettings = {
  window: { x: 100, y: 100, visible: true, width: 220, height: 580 },
  pipe: { name: "devsprite", buffer_size: 4096, connect_timeout: 3000, max_retries: 3 },
  theme: {
    primary_color: "#667eea",
    primary_dark_color: "#764ba2",
    panel_width: 200,
    panel_background_opacity: 0.95,
    panel_border_radius: 12,
  },
  behavior: { max_tool_calls: 5, permission_timeout: 30, hotkey: "Ctrl+Shift+D", sound_enabled: true, sound_volume: 80, auto_launch: false },
};

describe("useAppStore", () => {
  beforeEach(() => {
    useAppStore.setState({
      sessions: new Map(),
      activeSessionId: null,
      pendingResponses: [],
      settings: defaultSettings,
    });
    vi.clearAllMocks();
  });

  it("should have correct initial state", () => {
    const state = useAppStore.getState();
    expect(state.sessions.size).toBe(0);
    expect(state.activeSessionId).toBeNull();
    expect(state.pendingResponses).toEqual([]);
  });

  it("should create session on ensureSession", () => {
    useAppStore.getState().ensureSession("sess1");
    const state = useAppStore.getState();
    expect(state.sessions.has("sess1")).toBe(true);
    const session = state.sessions.get("sess1")!;
    expect(session.status).toBe("idle");
    expect(session.toolCalls).toEqual([]);
    expect(session.permissionRequests).toEqual([]);
  });

  it("should not overwrite existing session on ensureSession", () => {
    useAppStore.getState().ensureSession("sess1");
    useAppStore.getState().setActiveSession("sess1");
    useAppStore.getState().setStatus("active", "hello");
    useAppStore.getState().ensureSession("sess1");
    const session = useAppStore.getState().sessions.get("sess1")!;
    expect(session.status).toBe("active");
    expect(session.statusMessage).toBe("hello");
  });

  it("should set active session", () => {
    useAppStore.getState().ensureSession("sess1");
    useAppStore.getState().setActiveSession("sess1");
    expect(useAppStore.getState().activeSessionId).toBe("sess1");
  });

  it("should update status on active session", () => {
    useAppStore.getState().ensureSession("sess1");
    useAppStore.getState().setActiveSession("sess1");
    useAppStore.getState().setStatus("working", "执行中");
    const session = useAppStore.getState().sessions.get("sess1")!;
    expect(session.status).toBe("working");
    expect(session.statusMessage).toBe("执行中");
  });

  it("should not update status if no active session", () => {
    useAppStore.getState().setStatus("working", "no session");
    expect(useAppStore.getState().sessions.size).toBe(0);
  });

  it("should add tool call with addToolCall", () => {
    useAppStore.getState().ensureSession("sess1");
    useAppStore.getState().setActiveSession("sess1");
    const toolCall: ToolCall = {
      id: "1",
      toolName: "Read",
      target: "/path/to/file.rs",
      status: "completed",
      timestamp: Date.now(),
      sessionId: "sess1",
    };
    useAppStore.getState().addToolCall(toolCall);
    const session = useAppStore.getState().sessions.get("sess1")!;
    expect(session.toolCalls).toHaveLength(1);
    expect(session.toolCalls[0].toolName).toBe("Read");
  });

  it("should route tool call by sessionId field", () => {
    useAppStore.getState().ensureSession("sess1");
    useAppStore.getState().ensureSession("sess2");
    useAppStore.getState().setActiveSession("sess1");

    useAppStore.getState().addToolCall({
      id: "1", toolName: "A", target: "/a", status: "completed", timestamp: Date.now(), sessionId: "sess2",
    });

    expect(useAppStore.getState().sessions.get("sess1")!.toolCalls).toHaveLength(0);
    expect(useAppStore.getState().sessions.get("sess2")!.toolCalls).toHaveLength(1);
  });

  it("should limit tool calls to 5", () => {
    useAppStore.getState().ensureSession("sess1");
    useAppStore.getState().setActiveSession("sess1");
    for (let i = 0; i < 8; i++) {
      useAppStore.getState().addToolCall({
        id: String(i),
        toolName: `Tool${i}`,
        target: `/path/${i}`,
        status: "completed",
        timestamp: Date.now(),
        sessionId: "sess1",
      });
    }
    expect(useAppStore.getState().sessions.get("sess1")!.toolCalls).toHaveLength(5);
  });

  it("should clear tool calls", () => {
    useAppStore.getState().ensureSession("sess1");
    useAppStore.getState().setActiveSession("sess1");
    useAppStore.getState().addToolCall({
      id: "1", toolName: "Read", target: "/path", status: "completed", timestamp: Date.now(), sessionId: "sess1",
    });
    useAppStore.getState().clearToolCalls();
    expect(useAppStore.getState().sessions.get("sess1")!.toolCalls).toEqual([]);
  });

  it("should add permission request", () => {
    useAppStore.getState().ensureSession("sess1");
    useAppStore.getState().setActiveSession("sess1");
    const request: PermissionRequest = {
      id: "p1",
      operation: "Read",
      target: "/secret/file",
      reason: "Needs access",
      timestamp: Date.now(),
      sessionId: "sess1",
    };
    useAppStore.getState().addPermissionRequest(request);
    expect(useAppStore.getState().sessions.get("sess1")!.permissionRequests).toHaveLength(1);
  });

  it("should respond to permission with approval", async () => {
    mockInvoke.mockResolvedValue(undefined);

    useAppStore.getState().ensureSession("sess1");
    useAppStore.getState().setActiveSession("sess1");
    useAppStore.getState().addPermissionRequest({
      id: "p1", operation: "Read", target: "/file", reason: "access", timestamp: Date.now(), sessionId: "sess1",
    });

    await useAppStore.getState().respondToPermission("p1", true);

    expect(mockInvoke).toHaveBeenCalledWith("respond_permission", {
      requestId: "p1",
      sessionId: "sess1",
      approved: true,
    });
    expect(useAppStore.getState().sessions.get("sess1")!.permissionRequests).toHaveLength(0);
    // pendingResponses is cleaned up after successful processing
    expect(useAppStore.getState().pendingResponses).toHaveLength(0);
  });

  it("should respond to permission with rejection", async () => {
    mockInvoke.mockResolvedValue(undefined);

    useAppStore.getState().ensureSession("sess1");
    useAppStore.getState().setActiveSession("sess1");
    useAppStore.getState().addPermissionRequest({
      id: "p2", operation: "Write", target: "/file", reason: "access", timestamp: Date.now(), sessionId: "sess1",
    });

    await useAppStore.getState().respondToPermission("p2", false);

    expect(mockInvoke).toHaveBeenCalledWith("respond_permission", {
      requestId: "p2",
      sessionId: "sess1",
      approved: false,
    });
    // pendingResponses is cleaned up after successful processing
    expect(useAppStore.getState().pendingResponses).toHaveLength(0);
  });

  it("should keep request on invoke failure", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockInvoke.mockRejectedValue(new Error("IPC failed"));

    useAppStore.getState().ensureSession("sess1");
    useAppStore.getState().setActiveSession("sess1");
    useAppStore.getState().addPermissionRequest({
      id: "p3", operation: "Bash", target: "/cmd", reason: "run", timestamp: Date.now(), sessionId: "sess1",
    });

    await useAppStore.getState().respondToPermission("p3", true);

    expect(useAppStore.getState().sessions.get("sess1")!.permissionRequests).toHaveLength(1);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should load settings", async () => {
    const mockSettings = {
      window: { x: 200, y: 200, visible: true, width: 220, height: 580 },
      pipe: { name: "devsprite", buffer_size: 4096, connect_timeout: 3000, max_retries: 3 },
      theme: {
        primary_color: "#ff0000",
        primary_dark_color: "#764ba2",
        panel_width: 200,
        panel_background_opacity: 0.95,
        panel_border_radius: 12,
      },
      behavior: { max_tool_calls: 5, permission_timeout: 30, hotkey: "Ctrl+Shift+D", sound_enabled: true, sound_volume: 80, auto_launch: false },
    };
    mockInvoke.mockResolvedValue(mockSettings);

    const setPropertySpy = vi.spyOn(
      document.documentElement.style,
      "setProperty"
    ).mockImplementation(() => {});

    await useAppStore.getState().loadSettings();

    expect(mockInvoke).toHaveBeenCalledWith("get_settings");
    expect(useAppStore.getState().settings.theme.primary_color).toBe("#ff0000");
    expect(setPropertySpy).toHaveBeenCalledWith("--color-primary", "#ff0000");
    setPropertySpy.mockRestore();
  });

  it("should update settings", async () => {
    const newSettings = {
      window: { x: 100, y: 100, visible: true, width: 220, height: 580 },
      pipe: { name: "devsprite", buffer_size: 4096, connect_timeout: 3000, max_retries: 3 },
      theme: {
        primary_color: "#00ff00",
        primary_dark_color: "#764ba2",
        panel_width: 250,
        panel_background_opacity: 0.9,
        panel_border_radius: 16,
      },
      behavior: { max_tool_calls: 8, permission_timeout: 30, hotkey: "Ctrl+Shift+D", sound_enabled: true, sound_volume: 80, auto_launch: false },
    };
    mockInvoke.mockResolvedValue(undefined);

    const setPropertySpy = vi.spyOn(
      document.documentElement.style,
      "setProperty"
    ).mockImplementation(() => {});

    await useAppStore.getState().updateSettings(newSettings);

    expect(mockInvoke).toHaveBeenCalledWith("update_settings", { settings: newSettings });
    expect(useAppStore.getState().settings.behavior.max_tool_calls).toBe(8);
    expect(setPropertySpy).toHaveBeenCalledWith("--color-primary", "#00ff00");
    expect(setPropertySpy).toHaveBeenCalledWith("--panel-width", "250px");
    setPropertySpy.mockRestore();
  });

  it("should apply theme to CSS variables", () => {
    const setPropertySpy = vi.spyOn(
      document.documentElement.style,
      "setProperty"
    ).mockImplementation(() => {});

    useAppStore.getState().applyTheme({
      primary_color: "#aabbcc",
      primary_dark_color: "#ddeeff",
      panel_width: 180,
      panel_background_opacity: 0.8,
      panel_border_radius: 8,
    });

    expect(setPropertySpy).toHaveBeenCalledWith("--color-primary", "#aabbcc");
    expect(setPropertySpy).toHaveBeenCalledWith("--color-primary-dark", "#ddeeff");
    expect(setPropertySpy).toHaveBeenCalledWith("--panel-width", "180px");
    expect(setPropertySpy).toHaveBeenCalledWith("--panel-opacity", "0.8");
    expect(setPropertySpy).toHaveBeenCalledWith("--panel-border-radius", "8px");
    setPropertySpy.mockRestore();
  });

  it("should respect max_tool_calls from settings", () => {
    useAppStore.setState({
      settings: {
        ...useAppStore.getState().settings,
        behavior: { ...useAppStore.getState().settings.behavior, max_tool_calls: 8 },
      },
    });

    useAppStore.getState().ensureSession("sess1");
    useAppStore.getState().setActiveSession("sess1");

    for (let i = 0; i < 10; i++) {
      useAppStore.getState().addToolCall({
        id: String(i),
        toolName: `Tool${i}`,
        target: `/path/${i}`,
        status: "completed",
        timestamp: Date.now(),
        sessionId: "sess1",
      });
    }
    expect(useAppStore.getState().sessions.get("sess1")!.toolCalls).toHaveLength(8);
  });

  it("should auto-deny permission request after timeout", async () => {
    vi.useFakeTimers();

    useAppStore.getState().ensureSession("sess1");
    useAppStore.getState().setActiveSession("sess1");

    useAppStore.getState().addPermissionRequest({
      id: "perm-timeout-test",
      operation: "Read",
      target: "/file",
      reason: "test",
      timestamp: Date.now(),
      sessionId: "sess1",
    });
    useAppStore.getState().startPermissionTimeout("perm-timeout-test");

    expect(useAppStore.getState().sessions.get("sess1")!.permissionRequests).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(30000);

    expect(useAppStore.getState().sessions.get("sess1")!.permissionRequests).toHaveLength(0);
    vi.useRealTimers();
  });

  it("should cancel timeout when permission is manually responded", async () => {
    vi.useFakeTimers();

    useAppStore.getState().ensureSession("sess1");
    useAppStore.getState().setActiveSession("sess1");

    useAppStore.getState().addPermissionRequest({
      id: "perm-cancel-test",
      operation: "Write",
      target: "/file",
      reason: "test",
      timestamp: Date.now(),
      sessionId: "sess1",
    });
    useAppStore.getState().startPermissionTimeout("perm-cancel-test");

    mockInvoke.mockResolvedValue(undefined);
    await useAppStore.getState().respondToPermission("perm-cancel-test", true);

    await vi.advanceTimersByTimeAsync(30000);

    expect(useAppStore.getState().sessions.get("sess1")!.permissionRequests).toHaveLength(0);
    vi.useRealTimers();
  });

  it("should isolate sessions - tool calls in one session do not affect another", () => {
    useAppStore.getState().ensureSession("sess1");
    useAppStore.getState().ensureSession("sess2");
    useAppStore.getState().setActiveSession("sess1");

    useAppStore.getState().addToolCall({
      id: "1", toolName: "A", target: "/a", status: "completed", timestamp: Date.now(), sessionId: "sess1",
    });
    useAppStore.getState().setActiveSession("sess2");
    useAppStore.getState().addToolCall({
      id: "2", toolName: "B", target: "/b", status: "completed", timestamp: Date.now(), sessionId: "sess2",
    });

    expect(useAppStore.getState().sessions.get("sess1")!.toolCalls).toHaveLength(1);
    expect(useAppStore.getState().sessions.get("sess1")!.toolCalls[0].toolName).toBe("A");
    expect(useAppStore.getState().sessions.get("sess2")!.toolCalls).toHaveLength(1);
    expect(useAppStore.getState().sessions.get("sess2")!.toolCalls[0].toolName).toBe("B");
  });

  it("getActiveSession helper should return active session or undefined", () => {
    const state1 = useAppStore.getState();
    expect(getActiveSession(state1)).toBeUndefined();

    useAppStore.getState().ensureSession("sess1");
    useAppStore.getState().setActiveSession("sess1");
    const state2 = useAppStore.getState();
    expect(getActiveSession(state2)).toBeDefined();
    expect(getActiveSession(state2)!.sessionId).toBe("sess1");
  });

  it("should add chat message with addChatMessage", () => {
    useAppStore.getState().ensureSession("sess1");
    useAppStore.getState().setActiveSession("sess1");
    useAppStore.getState().addChatMessage({
      role: "user",
      content: "Hello world",
      timestamp: Date.now(),
    });
    const session = useAppStore.getState().sessions.get("sess1")!;
    expect(session.chatMessages).toHaveLength(1);
    expect(session.chatMessages[0].role).toBe("user");
    expect(session.chatMessages[0].content).toBe("Hello world");
  });

  it("should limit chat messages to 20", () => {
    useAppStore.getState().ensureSession("sess1");
    useAppStore.getState().setActiveSession("sess1");
    for (let i = 0; i < 25; i++) {
      useAppStore.getState().addChatMessage({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i}`,
        timestamp: Date.now() + i,
      });
    }
    expect(useAppStore.getState().sessions.get("sess1")!.chatMessages).toHaveLength(20);
    // Should keep the last 20
    expect(useAppStore.getState().sessions.get("sess1")!.chatMessages[0].content).toBe("Message 5");
  });

  it("should initialize chatMessages as empty array in new sessions", () => {
    useAppStore.getState().ensureSession("sess1");
    const session = useAppStore.getState().sessions.get("sess1")!;
    expect(session.chatMessages).toEqual([]);
  });
});
