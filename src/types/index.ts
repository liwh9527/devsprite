export type SpriteStatus = "idle" | "active" | "working" | "waiting" | "error";

export interface ToolCall {
  id: string;
  toolName: string;
  target: string;
  status: "pending" | "completed" | "failed";
  timestamp: number;
  detail?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface PermissionRequest {
  id: string;
  operation: string;
  target: string;
  reason: string;
  timestamp: number;
}

export interface PermissionResponse {
  requestId: string;
  approved: boolean;
  timestamp: number;
}

export interface DevSpriteEvent {
  event:
    | "session_start"
    | "session_end"
    | "tool_call"
    | "permission_request"
    | "permission_response"
    | "status_change"
    | "ai_response";
  timestamp: string;
  session_id: string;
  data: Record<string, unknown>;
}

export interface ToolCallData {
  tool_name: string;
  file_path: string;
  status: "pending" | "completed" | "failed";
}

export interface PermissionRequestData {
  operation: string;
  target: string;
  reason: string;
}

export interface StatusChangeData {
  status: SpriteStatus;
  message: string;
}

export interface AppState {
  status: SpriteStatus;
  statusMessage: string;
  sessionId: string | null;
  toolCalls: ToolCall[];
  permissionRequests: PermissionRequest[];
  isWidgetVisible: boolean;
  pendingResponses: PermissionResponse[];
}

export interface WindowSettings {
  x: number;
  y: number;
  visible: boolean;
  width: number;
  height: number;
}

export interface PipeSettings {
  name: string;
  buffer_size: number;
  connect_timeout: number;
  max_retries: number;
}

export interface ThemeSettings {
  primary_color: string;
  primary_dark_color: string;
  panel_width: number;
  panel_background_opacity: number;
  panel_border_radius: number;
}

export interface BehaviorSettings {
  max_tool_calls: number;
  permission_timeout: number;
  mascot_path: string | null;
  hotkey: string;
}

export interface Settings {
  window: WindowSettings;
  pipe: PipeSettings;
  theme: ThemeSettings;
  behavior: BehaviorSettings;
}
