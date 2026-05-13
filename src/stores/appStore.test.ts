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
});
