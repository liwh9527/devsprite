import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAppStore } from "../stores/appStore";

// Mock @tauri-apps/api/event
const mockListen = vi.fn();
vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: any[]) => mockListen(...args),
}));

// Mock @tauri-apps/api/core
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
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
  behavior: { max_tool_calls: 5, permission_timeout: 30, hotkey: "Ctrl+Shift+D" },
};

describe("useTauriEvent", () => {
  let devSpriteCallback: (event: any) => void;
  let settingsCallback: (event: any) => void;

  beforeEach(() => {
    useAppStore.setState({
      sessions: new Map(),
      activeSessionId: null,
      pendingResponses: [],
      settings: defaultSettings,
    });

    // Default mock: return resolved promise for both listeners
    mockListen.mockImplementation(
      (eventName: string, callback: (event: any) => void) => {
        if (eventName === "devsprite-event") {
          devSpriteCallback = callback;
        } else if (eventName === "settings-changed") {
          settingsCallback = callback;
        }
        return Promise.resolve(vi.fn());
      }
    );

    // Default mock for invoke (for loadSettings)
    mockInvoke.mockResolvedValue(defaultSettings);

    vi.clearAllMocks();

    // Re-setup after clearAllMocks
    mockListen.mockImplementation(
      (eventName: string, callback: (event: any) => void) => {
        if (eventName === "devsprite-event") {
          devSpriteCallback = callback;
        } else if (eventName === "settings-changed") {
          settingsCallback = callback;
        }
        return Promise.resolve(vi.fn());
      }
    );

    mockInvoke.mockResolvedValue(defaultSettings);
  });

  it("should listen to devsprite-event", () => {
    renderHook(() => useTauriEvent());
    expect(mockListen).toHaveBeenCalledWith(
      "devsprite-event",
      expect.any(Function)
    );
  });

  it("should also listen to settings-changed", () => {
    renderHook(() => useTauriEvent());
    expect(mockListen).toHaveBeenCalledWith(
      "settings-changed",
      expect.any(Function)
    );
  });

  it("should create session and set status to active on session_start", () => {
    renderHook(() => useTauriEvent());

    act(() => {
      devSpriteCallback({
        payload: {
          event: "session_start",
          session_id: "sess1",
          data: {},
        },
      });
    });

    const state = useAppStore.getState();
    expect(state.activeSessionId).toBe("sess1");
    expect(state.sessions.has("sess1")).toBe(true);
    expect(state.sessions.get("sess1")!.status).toBe("active");
  });

  it("should set status to idle on session_end", () => {
    renderHook(() => useTauriEvent());

    act(() => {
      devSpriteCallback({
        payload: {
          event: "session_start",
          session_id: "sess1",
          data: {},
        },
      });
    });

    act(() => {
      devSpriteCallback({
        payload: {
          event: "session_end",
          session_id: "sess1",
          data: {},
        },
      });
    });

    expect(useAppStore.getState().sessions.get("sess1")!.status).toBe("idle");
  });

  it("should add tool call and set working on tool_call event", () => {
    renderHook(() => useTauriEvent());

    act(() => {
      devSpriteCallback({
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

    const state = useAppStore.getState();
    expect(state.sessions.get("sess1")!.status).toBe("working");
    expect(state.sessions.get("sess1")!.toolCalls).toHaveLength(1);
    expect(state.sessions.get("sess1")!.toolCalls[0].toolName).toBe("Read");
  });

  it("should add permission request on permission_request event", () => {
    renderHook(() => useTauriEvent());

    act(() => {
      devSpriteCallback({
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

    const state = useAppStore.getState();
    expect(state.sessions.get("sess1")!.status).toBe("waiting");
    expect(state.sessions.get("sess1")!.permissionRequests).toHaveLength(1);
  });

  it("should update status on status_change event", () => {
    renderHook(() => useTauriEvent());

    act(() => {
      devSpriteCallback({
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

    const session = useAppStore.getState().sessions.get("sess1")!;
    expect(session.status).toBe("error");
    expect(session.statusMessage).toBe("Something went wrong");
  });

  it("should set status to active on ai_response event", () => {
    renderHook(() => useTauriEvent());

    act(() => {
      devSpriteCallback({
        payload: {
          event: "ai_response",
          session_id: "sess1",
          data: {},
        },
      });
    });

    expect(useAppStore.getState().sessions.get("sess1")!.status).toBe("active");
  });

  it("should reload settings on settings-changed event", async () => {
    renderHook(() => useTauriEvent());

    mockInvoke.mockResolvedValue({
      window: { x: 200, y: 200, visible: true, width: 250, height: 580 },
      pipe: { name: "newpipe", buffer_size: 8192, connect_timeout: 5000, max_retries: 3 },
      theme: {
        primary_color: "#ff0000",
        primary_dark_color: "#00ff00",
        panel_width: 250,
        panel_background_opacity: 0.8,
        panel_border_radius: 16,
      },
      behavior: { max_tool_calls: 8, permission_timeout: 45, hotkey: "Ctrl+Shift+D" },
    });

    const setPropertySpy = vi.spyOn(document.documentElement.style, "setProperty").mockImplementation(() => {});

    settingsCallback({ payload: null });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("get_settings");
    });
    expect(useAppStore.getState().settings.pipe.name).toBe("newpipe");
    expect(setPropertySpy).toHaveBeenCalledWith("--color-primary", "#ff0000");
    setPropertySpy.mockRestore();
  });
});
