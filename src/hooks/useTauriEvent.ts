import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "../stores/appStore";
import type {
  DevSpriteEvent,
  ToolCallData,
  PermissionRequestData,
  StatusChangeData,
  SpriteStatus,
} from "../types";

export function useTauriEvent() {
  const {
    setStatus,
    setSessionId,
    addToolCall,
    addPermissionRequest,
    startPermissionTimeout,
    loadSettings,
  } = useAppStore();

  useEffect(() => {
    const unlisten = listen<DevSpriteEvent>("devsprite-event", (event) => {
      const { event: eventType, session_id, data } = event.payload;

      setSessionId(session_id);

      switch (eventType) {
        case "session_start":
          setStatus("active", "会话开始");
          break;

        case "session_end":
          setStatus("idle", "会话结束");
          break;

        case "tool_call": {
          const toolData = data as unknown as ToolCallData;
          addToolCall({
            id: crypto.randomUUID(),
            toolName: toolData.tool_name,
            target: toolData.file_path,
            status: toolData.status as "pending" | "completed" | "failed",
            timestamp: Date.now(),
          });
          setStatus("working", `正在执行 ${toolData.tool_name}`);
          break;
        }

        case "permission_request": {
          const permData = data as unknown as PermissionRequestData;
          const requestId = crypto.randomUUID();
          addPermissionRequest({
            id: requestId,
            operation: permData.operation,
            target: permData.target,
            reason: permData.reason,
            timestamp: Date.now(),
          });
          startPermissionTimeout(requestId);
          setStatus("waiting", "等待权限批准");
          break;
        }

        case "status_change": {
          const statusData = data as unknown as StatusChangeData;
          setStatus(statusData.status as SpriteStatus, statusData.message);
          break;
        }

        case "ai_response":
          setStatus("active", "AI 已回复");
          break;
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setStatus, setSessionId, addToolCall, addPermissionRequest, startPermissionTimeout]);

  useEffect(() => {
    const unlisten = listen<null>("settings-changed", () => {
      loadSettings();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [loadSettings]);
}
