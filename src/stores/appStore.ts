import { create } from "zustand";
import type {
  AppState,
  SpriteStatus,
  ToolCall,
  PermissionRequest,
} from "../types";

interface AppStore extends AppState {
  setStatus: (status: SpriteStatus, message?: string) => void;
  setSessionId: (id: string | null) => void;
  addToolCall: (toolCall: ToolCall) => void;
  removeToolCall: (id: string) => void;
  clearToolCalls: () => void;
  addPermissionRequest: (request: PermissionRequest) => void;
  removePermissionRequest: (id: string) => void;
  setWidgetVisible: (visible: boolean) => void;
  toggleWidget: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  status: "idle",
  statusMessage: "",
  sessionId: null,
  toolCalls: [],
  permissionRequests: [],
  isWidgetVisible: true,

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

  setWidgetVisible: (isWidgetVisible) => set({ isWidgetVisible }),

  toggleWidget: () =>
    set((state) => ({ isWidgetVisible: !state.isWidgetVisible })),
}));
