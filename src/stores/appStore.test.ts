import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAppStore } from "./appStore";
import type { ToolCall, PermissionRequest } from "../types";

// Mock @tauri-apps/api/core
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";

const mockInvoke = invoke as ReturnType<typeof vi.fn>;

describe("useAppStore", () => {
  beforeEach(() => {
    // Reset store to initial state
    useAppStore.setState({
      status: "idle",
      statusMessage: "",
      sessionId: null,
      toolCalls: [],
      permissionRequests: [],
      isWidgetVisible: true,
      pendingResponses: [],
      settings: {
        window: { x: 100, y: 100, visible: true, width: 220, height: 580 },
        pipe: { name: "devsprite", buffer_size: 4096, connect_timeout: 3000, max_retries: 3 },
        theme: {
          primary_color: "#667eea",
          primary_dark_color: "#764ba2",
          panel_width: 200,
          panel_background_opacity: 0.95,
          panel_border_radius: 12,
        },
        behavior: { max_tool_calls: 5, permission_timeout: 30, mascot_path: null, hotkey: "Ctrl+Shift+D" },
      },
    });
    vi.clearAllMocks();
  });

  it("should have correct initial state", () => {
    const state = useAppStore.getState();
    expect(state.status).toBe("idle");
    expect(state.statusMessage).toBe("");
    expect(state.sessionId).toBeNull();
    expect(state.toolCalls).toEqual([]);
    expect(state.permissionRequests).toEqual([]);
    expect(state.isWidgetVisible).toBe(true);
    expect(state.pendingResponses).toEqual([]);
  });

  it("should update status with setStatus", () => {
    useAppStore.getState().setStatus("working", "执行中");
    const state = useAppStore.getState();
    expect(state.status).toBe("working");
    expect(state.statusMessage).toBe("执行中");
  });

  it("should add tool call with addToolCall", () => {
    const toolCall: ToolCall = {
      id: "1",
      toolName: "Read",
      target: "/path/to/file.rs",
      status: "completed",
      timestamp: Date.now(),
    };
    useAppStore.getState().addToolCall(toolCall);
    expect(useAppStore.getState().toolCalls).toHaveLength(1);
    expect(useAppStore.getState().toolCalls[0].toolName).toBe("Read");
  });

  it("should limit tool calls to 5", () => {
    for (let i = 0; i < 8; i++) {
      useAppStore.getState().addToolCall({
        id: String(i),
        toolName: `Tool${i}`,
        target: `/path/${i}`,
        status: "completed",
        timestamp: Date.now(),
      });
    }
    expect(useAppStore.getState().toolCalls).toHaveLength(5);
  });

  it("should clear tool calls", () => {
    useAppStore.getState().addToolCall({
      id: "1",
      toolName: "Read",
      target: "/path",
      status: "completed",
      timestamp: Date.now(),
    });
    useAppStore.getState().clearToolCalls();
    expect(useAppStore.getState().toolCalls).toEqual([]);
  });

  it("should add permission request", () => {
    const request: PermissionRequest = {
      id: "p1",
      operation: "Read",
      target: "/secret/file",
      reason: "Needs access",
      timestamp: Date.now(),
    };
    useAppStore.getState().addPermissionRequest(request);
    expect(useAppStore.getState().permissionRequests).toHaveLength(1);
  });

  it("should respond to permission with approval", async () => {
    mockInvoke.mockResolvedValue(undefined);

    useAppStore.getState().addPermissionRequest({
      id: "p1",
      operation: "Read",
      target: "/file",
      reason: "access",
      timestamp: Date.now(),
    });

    await useAppStore.getState().respondToPermission("p1", true);

    expect(mockInvoke).toHaveBeenCalledWith("respond_permission", {
      requestId: "p1",
      approved: true,
    });
    expect(useAppStore.getState().permissionRequests).toHaveLength(0);
    expect(useAppStore.getState().pendingResponses).toHaveLength(1);
    expect(useAppStore.getState().pendingResponses[0].approved).toBe(true);
  });

  it("should respond to permission with rejection", async () => {
    mockInvoke.mockResolvedValue(undefined);

    useAppStore.getState().addPermissionRequest({
      id: "p2",
      operation: "Write",
      target: "/file",
      reason: "access",
      timestamp: Date.now(),
    });

    await useAppStore.getState().respondToPermission("p2", false);

    expect(mockInvoke).toHaveBeenCalledWith("respond_permission", {
      requestId: "p2",
      approved: false,
    });
    expect(useAppStore.getState().pendingResponses[0].approved).toBe(false);
  });

  it("should keep request on invoke failure", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockInvoke.mockRejectedValue(new Error("IPC failed"));

    useAppStore.getState().addPermissionRequest({
      id: "p3",
      operation: "Bash",
      target: "/cmd",
      reason: "run",
      timestamp: Date.now(),
    });

    await useAppStore.getState().respondToPermission("p3", true);

    expect(useAppStore.getState().permissionRequests).toHaveLength(1);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should toggle widget visibility", () => {
    expect(useAppStore.getState().isWidgetVisible).toBe(true);
    useAppStore.getState().toggleWidget();
    expect(useAppStore.getState().isWidgetVisible).toBe(false);
    useAppStore.getState().toggleWidget();
    expect(useAppStore.getState().isWidgetVisible).toBe(true);
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
      behavior: { max_tool_calls: 5, permission_timeout: 30, mascot_path: null, hotkey: "Ctrl+Shift+D" },
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
      behavior: { max_tool_calls: 8, permission_timeout: 30, mascot_path: null, hotkey: "Ctrl+Shift+D" },
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

    for (let i = 0; i < 10; i++) {
      useAppStore.getState().addToolCall({
        id: String(i),
        toolName: `Tool${i}`,
        target: `/path/${i}`,
        status: "completed",
        timestamp: Date.now(),
      });
    }
    expect(useAppStore.getState().toolCalls).toHaveLength(8);
  });

  it("should auto-deny permission request after timeout", async () => {
    vi.useFakeTimers();
    const { addPermissionRequest, startPermissionTimeout } = useAppStore.getState();

    addPermissionRequest({
      id: "perm-timeout-test",
      operation: "Read",
      target: "/file",
      reason: "test",
      timestamp: Date.now(),
    });
    startPermissionTimeout("perm-timeout-test");

    expect(useAppStore.getState().permissionRequests).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(30000);

    expect(useAppStore.getState().permissionRequests).toHaveLength(0);
    vi.useRealTimers();
  });

  it("should cancel timeout when permission is manually responded", async () => {
    vi.useFakeTimers();
    const { addPermissionRequest, startPermissionTimeout } = useAppStore.getState();

    addPermissionRequest({
      id: "perm-cancel-test",
      operation: "Write",
      target: "/file",
      reason: "test",
      timestamp: Date.now(),
    });
    startPermissionTimeout("perm-cancel-test");

    mockInvoke.mockResolvedValue(undefined);
    await useAppStore.getState().respondToPermission("perm-cancel-test", true);

    await vi.advanceTimersByTimeAsync(30000);

    expect(useAppStore.getState().permissionRequests).toHaveLength(0);
    vi.useRealTimers();
  });
});
