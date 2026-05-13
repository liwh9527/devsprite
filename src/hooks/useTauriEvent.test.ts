import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppStore } from "../stores/appStore";

// Mock @tauri-apps/api/event
const mockListen = vi.fn();
vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: any[]) => mockListen(...args),
}));

// Mock @tauri-apps/api/core
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock @tauri-apps/api/window
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => ({
    startDragging: vi.fn(),
  })),
}));

// Mock crypto.randomUUID for jsdom
if (typeof crypto.randomUUID !== "function") {
  Object.defineProperty(globalThis, "crypto", {
    value: {
      ...globalThis.crypto,
      randomUUID: () => "mock-uuid-" + Math.random().toString(36).slice(2),
    },
    writable: true,
  });
}

import { useTauriEvent } from "./useTauriEvent";

describe("useTauriEvent", () => {
  let listenCallback: (event: any) => void;

  beforeEach(() => {
    useAppStore.setState({
      status: "idle",
      statusMessage: "",
      sessionId: null,
      toolCalls: [],
      permissionRequests: [],
      isWidgetVisible: true,
      pendingResponses: [],
    });

    mockListen.mockImplementation(
      (eventName: string, callback: (event: any) => void) => {
        listenCallback = callback;
        return Promise.resolve(vi.fn());
      }
    );
  });

  it("should listen to devsprite-event", () => {
    renderHook(() => useTauriEvent());
    expect(mockListen).toHaveBeenCalledWith(
      "devsprite-event",
      expect.any(Function)
    );
  });

  it("should set status to active on session_start", () => {
    renderHook(() => useTauriEvent());

    act(() => {
      listenCallback({
        payload: {
          event: "session_start",
          session_id: "sess1",
          data: {},
        },
      });
    });

    expect(useAppStore.getState().status).toBe("active");
    expect(useAppStore.getState().sessionId).toBe("sess1");
  });

  it("should set status to idle on session_end", () => {
    renderHook(() => useTauriEvent());

    act(() => {
      listenCallback({
        payload: {
          event: "session_end",
          session_id: "sess1",
          data: {},
        },
      });
    });

    expect(useAppStore.getState().status).toBe("idle");
  });

  it("should add tool call and set working on tool_call event", () => {
    renderHook(() => useTauriEvent());

    act(() => {
      listenCallback({
        payload: {
          event: "tool_call",
          session_id: "sess1",
          data: {
            tool_name: "Read",
            file_path: "/path/to/file.rs",
            status: "completed",
          },
        },
      });
    });

    expect(useAppStore.getState().status).toBe("working");
    expect(useAppStore.getState().toolCalls).toHaveLength(1);
    expect(useAppStore.getState().toolCalls[0].toolName).toBe("Read");
  });

  it("should add permission request on permission_request event", () => {
    renderHook(() => useTauriEvent());

    act(() => {
      listenCallback({
        payload: {
          event: "permission_request",
          session_id: "sess1",
          data: {
            operation: "Read",
            target: "/secret/file",
            reason: "needs access",
          },
        },
      });
    });

    expect(useAppStore.getState().status).toBe("waiting");
    expect(useAppStore.getState().permissionRequests).toHaveLength(1);
  });

  it("should update status on status_change event", () => {
    renderHook(() => useTauriEvent());

    act(() => {
      listenCallback({
        payload: {
          event: "status_change",
          session_id: "sess1",
          data: {
            status: "error",
            message: "Something went wrong",
          },
        },
      });
    });

    expect(useAppStore.getState().status).toBe("error");
    expect(useAppStore.getState().statusMessage).toBe("Something went wrong");
  });

  it("should set status to active on ai_response event", () => {
    renderHook(() => useTauriEvent());

    act(() => {
      listenCallback({
        payload: {
          event: "ai_response",
          session_id: "sess1",
          data: {},
        },
      });
    });

    expect(useAppStore.getState().status).toBe("active");
  });
});
