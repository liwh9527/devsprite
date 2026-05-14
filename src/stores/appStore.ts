import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type {
  AppState,
  SpriteStatus,
  ToolCall,
  PermissionRequest,
  PermissionResponse,
  Settings,
  ThemeSettings,
} from "../types";

const permissionTimers = new Map<string, ReturnType<typeof setTimeout>>();

interface AppStore extends AppState {
  settings: Settings;
  setStatus: (status: SpriteStatus, message?: string) => void;
  setSessionId: (id: string | null) => void;
  addToolCall: (toolCall: ToolCall) => void;
  removeToolCall: (id: string) => void;
  clearToolCalls: () => void;
  addPermissionRequest: (request: PermissionRequest) => void;
  removePermissionRequest: (id: string) => void;
  respondToPermission: (requestId: string, approved: boolean) => Promise<void>;
  setWidgetVisible: (visible: boolean) => void;
  toggleWidget: () => void;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
  applyTheme: (theme: ThemeSettings) => void;
  startPermissionTimeout: (requestId: string) => void;
  cancelPermissionTimeout: (requestId: string) => void;
  clearAllPermissionTimeouts: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
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

  setStatus: (status, message = "") =>
    set({ status, statusMessage: message }),

  setSessionId: (sessionId) => set({ sessionId }),

  addToolCall: (toolCall) =>
    set((state) => ({
      toolCalls: [toolCall, ...state.toolCalls].slice(0, state.settings.behavior.max_tool_calls),
    })),

  removeToolCall: (id) =>
    set((state) => ({
      toolCalls: state.toolCalls.filter((tc) => tc.id !== id),
    })),

  clearToolCalls: () => set({ toolCalls: [] }),

  addPermissionRequest: (request) =>
    set((state) => ({
      permissionRequests: [...state.permissionRequests, request],
    })),

  removePermissionRequest: (id) =>
    set((state) => {
      const timer = permissionTimers.get(id);
      if (timer) {
        clearTimeout(timer);
        permissionTimers.delete(id);
      }
      return {
        permissionRequests: state.permissionRequests.filter((r) => r.id !== id),
      };
    }),

  respondToPermission: async (requestId: string, approved: boolean) => {
    try {
      await invoke("respond_permission", { requestId, approved });

      const response: PermissionResponse = {
        requestId,
        approved,
        timestamp: Date.now(),
      };

      set((state) => ({
        permissionRequests: state.permissionRequests.filter((r) => r.id !== requestId),
        pendingResponses: [...state.pendingResponses, response],
      }));

      console.log(`Permission response sent: ${requestId} -> ${approved}`);
    } catch (error) {
      console.error("Failed to send permission response:", error);
    }
  },

  setWidgetVisible: (isWidgetVisible) => set({ isWidgetVisible }),

  toggleWidget: () =>
    set((state) => ({ isWidgetVisible: !state.isWidgetVisible })),

  loadSettings: async () => {
    try {
      const settings = await invoke<Settings>("get_settings");
      set({ settings });
      const { applyTheme } = get();
      applyTheme(settings.theme);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  },

  updateSettings: async (settings: Settings) => {
    try {
      await invoke("update_settings", { settings });
      set({ settings });
      const { applyTheme } = get();
      applyTheme(settings.theme);
    } catch (error) {
      console.error("Failed to update settings:", error);
    }
  },

  applyTheme: (theme: ThemeSettings) => {
    document.documentElement.style.setProperty("--color-primary", theme.primary_color);
    document.documentElement.style.setProperty("--color-primary-dark", theme.primary_dark_color);
    document.documentElement.style.setProperty("--panel-width", `${theme.panel_width}px`);
    document.documentElement.style.setProperty("--panel-opacity", String(theme.panel_background_opacity));
    document.documentElement.style.setProperty("--panel-border-radius", `${theme.panel_border_radius}px`);
  },

  startPermissionTimeout: (requestId: string) => {
    const timeout = get().settings.behavior.permission_timeout * 1000;

    const existing = permissionTimers.get(requestId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      get().respondToPermission(requestId, false);
      permissionTimers.delete(requestId);
      console.log(`Permission request ${requestId} auto-denied after ${timeout}ms`);
    }, timeout);

    permissionTimers.set(requestId, timer);
  },

  cancelPermissionTimeout: (requestId: string) => {
    const timer = permissionTimers.get(requestId);
    if (timer) {
      clearTimeout(timer);
      permissionTimers.delete(requestId);
    }
  },

  clearAllPermissionTimeouts: () => {
    permissionTimers.forEach((timer) => clearTimeout(timer));
    permissionTimers.clear();
  },
}));
