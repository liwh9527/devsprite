import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type {
  AppState,
  SessionState,
  SpriteStatus,
  ToolCall,
  PermissionRequest,
  PermissionResponse,
  Settings,
  ThemeSettings,
} from "../types";

const permissionTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const createSession = (sessionId: string): SessionState => ({
  sessionId,
  status: "idle",
  statusMessage: "",
  toolCalls: [],
  permissionRequests: [],
  lastActive: Date.now(),
});

export const getActiveSession = (state: AppState): SessionState | undefined => {
  return state.activeSessionId
    ? state.sessions.get(state.activeSessionId)
    : undefined;
};

/** Find which session owns a permission request by its id */
const findSessionForPermission = (
  sessions: Map<string, SessionState>,
  requestId: string
): [string, SessionState] | undefined => {
  for (const [sid, session] of sessions) {
    if (session.permissionRequests.some((r) => r.id === requestId)) {
      return [sid, session];
    }
  }
  return undefined;
};

interface AppStore extends AppState {
  isWidgetVisible: boolean;
  settings: Settings;
  ensureSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string) => void;
  setStatus: (status: SpriteStatus, message?: string) => void;
  addToolCall: (toolCall: ToolCall) => void;
  removeToolCall: (id: string) => void;
  clearToolCalls: () => void;
  addPermissionRequest: (request: PermissionRequest) => void;
  removePermissionRequest: (id: string) => void;
  respondToPermission: (requestId: string, approved: boolean) => Promise<void>;
  setWidgetVisible: (visible: boolean) => void;
  toggleWidget: () => void;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Settings) => Promise<{ success: boolean; error?: string }>;
  applyTheme: (theme: ThemeSettings) => void;
  startPermissionTimeout: (requestId: string) => void;
  cancelPermissionTimeout: (requestId: string) => void;
  clearAllPermissionTimeouts: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  sessions: new Map(),
  activeSessionId: null,
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
    behavior: { max_tool_calls: 5, permission_timeout: 30, hotkey: "Ctrl+Shift+D" },
  },

  ensureSession: (sessionId: string) => {
    set((state) => {
      if (state.sessions.has(sessionId)) return state;
      const sessions = new Map(state.sessions);
      sessions.set(sessionId, createSession(sessionId));
      return { sessions };
    });
  },

  setActiveSession: (sessionId: string) => set({ activeSessionId: sessionId }),

  setStatus: (status, message = "") =>
    set((state) => {
      if (!state.activeSessionId) return state;
      const sessions = new Map(state.sessions);
      const session = sessions.get(state.activeSessionId);
      if (session) {
        sessions.set(state.activeSessionId, {
          ...session,
          status,
          statusMessage: message,
          lastActive: Date.now(),
        });
      }
      return { sessions };
    }),

  addToolCall: (toolCall) =>
    set((state) => {
      const sid = toolCall.sessionId || state.activeSessionId;
      if (!sid) return state;
      const sessions = new Map(state.sessions);
      const session = sessions.get(sid);
      if (session) {
        sessions.set(sid, {
          ...session,
          toolCalls: [toolCall, ...session.toolCalls].slice(0, state.settings.behavior.max_tool_calls),
          lastActive: Date.now(),
        });
      }
      return { sessions };
    }),

  removeToolCall: (id) =>
    set((state) => {
      const sessions = new Map(state.sessions);
      for (const [sid, session] of sessions) {
        const filtered = session.toolCalls.filter((tc) => tc.id !== id);
        if (filtered.length !== session.toolCalls.length) {
          sessions.set(sid, { ...session, toolCalls: filtered });
        }
      }
      return { sessions };
    }),

  clearToolCalls: () =>
    set((state) => {
      if (!state.activeSessionId) return state;
      const sessions = new Map(state.sessions);
      const session = sessions.get(state.activeSessionId);
      if (session) {
        sessions.set(state.activeSessionId, { ...session, toolCalls: [] });
      }
      return { sessions };
    }),

  addPermissionRequest: (request) =>
    set((state) => {
      const sid = request.sessionId || state.activeSessionId;
      if (!sid) return state;
      const sessions = new Map(state.sessions);
      const session = sessions.get(sid);
      if (session) {
        sessions.set(sid, {
          ...session,
          permissionRequests: [...session.permissionRequests, request],
          lastActive: Date.now(),
        });
      }
      return { sessions };
    }),

  removePermissionRequest: (id) =>
    set((state) => {
      const timer = permissionTimers.get(id);
      if (timer) {
        clearTimeout(timer);
        permissionTimers.delete(id);
      }
      const found = findSessionForPermission(state.sessions, id);
      if (!found) return state;
      const [sid, session] = found;
      const sessions = new Map(state.sessions);
      sessions.set(sid, {
        ...session,
        permissionRequests: session.permissionRequests.filter((r) => r.id !== id),
      });
      return { sessions };
    }),

  respondToPermission: async (requestId: string, approved: boolean) => {
    try {
      const currentSessions = get().sessions;
      const found = findSessionForPermission(currentSessions, requestId);
      const resolvedSessionId = found ? found[0] : "";

      await invoke("respond_permission", { requestId, sessionId: resolvedSessionId, approved });

      const response: PermissionResponse = {
        requestId,
        sessionId: resolvedSessionId,
        approved,
        timestamp: Date.now(),
      };

      set((state) => {
        const found = findSessionForPermission(state.sessions, requestId);
        let sessions = state.sessions;
        if (found) {
          const [sid, session] = found;
          sessions = new Map(state.sessions);
          sessions.set(sid, {
            ...session,
            permissionRequests: session.permissionRequests.filter((r) => r.id !== requestId),
          });
        }
        return {
          sessions,
          pendingResponses: [...state.pendingResponses, response].slice(-10),
        };
      });

      console.log(`Permission response sent: ${requestId} -> ${approved}`);
    } catch (error) {
      console.error("Failed to send permission response:", error);
    }
  },

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
      return { success: true };
    } catch (error) {
      console.error("Failed to update settings:", error);
      return { success: false, error: String(error) };
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
      // Update status message on the session that owns this request
      set((state) => {
        const found = findSessionForPermission(state.sessions, requestId);
        if (!found) return state;
        const [sid, session] = found;
        const sessions = new Map(state.sessions);
        sessions.set(sid, { ...session, statusMessage: "权限请求已超时自动拒绝" });
        return { sessions };
      });
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

}));

