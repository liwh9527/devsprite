import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type {
  AppState,
  SpriteStatus,
  ToolCall,
  PermissionRequest,
  PermissionResponse,
} from "../types";

interface AppStore extends AppState {
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
}

export const useAppStore = create<AppStore>((set, get) => ({
  status: "idle",
  statusMessage: "",
  sessionId: null,
  toolCalls: [],
  permissionRequests: [],
  isWidgetVisible: true,
  pendingResponses: [],

  setStatus: (status, message = "") =>
    set({ status, statusMessage: message }),

  setSessionId: (sessionId) => set({ sessionId }),

  addToolCall: (toolCall) =>
    set((state) => ({
      toolCalls: [toolCall, ...state.toolCalls].slice(0, 5),
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
    set((state) => ({
      permissionRequests: state.permissionRequests.filter((r) => r.id !== id),
    })),

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
}));
