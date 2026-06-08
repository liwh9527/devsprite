import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "../stores/appStore";
import {
  playStartSound,
  playCompleteSound,
  playErrorSound,
  playApprovalSound,
} from "../utils/sounds";
import type {
  DevSpriteEvent,
  ToolCallData,
  PermissionRequestData,
  StatusChangeData,
  UserPromptData,
  AiResponseData,
  SpriteStatus,
} from "../types";

export function useTauriEvent() {
  const heartbeatRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetHeartbeat = () => {
    setConnectionStatus("connected");
    if (heartbeatRef.current) clearTimeout(heartbeatRef.current);
    heartbeatRef.current = setTimeout(() => {
      setConnectionStatus("disconnected");
    }, 60000);
  };

  const {
    ensureSession,
    setActiveSession,
    setStatus,
    addToolCall,
    updateToolCall,
    addPermissionRequest,
    startPermissionTimeout,
    addChatMessage,
    clearAllPermissionTimeouts,
    setConnectionStatus,
    loadSettings,
  } = useAppStore();

  useEffect(() => {
    const unlisten = listen<DevSpriteEvent>("devsprite-event", (event) => {
      const { event: eventType, session_id, data } = event.payload;
      const { settings } = useAppStore.getState();

      // Reset connection heartbeat on any event
      resetHeartbeat();
      const soundEnabled = settings.behavior.sound_enabled;
      const soundVolume = settings.behavior.sound_volume / 100;

      // Ensure session exists and is active
      ensureSession(session_id);
      setActiveSession(session_id);

      switch (eventType) {
        case "session_start":
          setStatus("active", "会话开始");
          if (soundEnabled) playStartSound(soundVolume);
          break;

        case "session_end":
          setStatus("idle", "会话结束");
          if (soundEnabled) playCompleteSound(soundVolume);
          break;

        case "tool_call": {
          const toolData = data as unknown as ToolCallData;
          const status = toolData.status as "pending" | "completed" | "failed";

          // For completed/failed events, try to update an existing pending entry
          if (status === "completed" || status === "failed") {
            const state = useAppStore.getState();
            const session = state.sessions.get(session_id);
            const existing = session?.toolCalls.find(
              (tc) =>
                tc.toolName === toolData.tool_name &&
                tc.target === toolData.file_path &&
                tc.status === "pending"
            );
            if (existing) {
              updateToolCall(existing.id, {
                status,
                detail: toolData.detail || existing.detail,
                timestamp: Date.now(),
              });
              if (status === "failed" && soundEnabled) playErrorSound(soundVolume);
              break;
            }
          }

          // No matching pending entry — create a new one
          addToolCall({
            id: crypto.randomUUID(),
            toolName: toolData.tool_name,
            target: toolData.file_path,
            status,
            timestamp: Date.now(),
            sessionId: session_id,
            detail: toolData.detail,
          });
          setStatus("working", `正在执行 ${toolData.tool_name}`);
          if (soundEnabled && status === "failed") playErrorSound(soundVolume);
          break;
        }

        case "permission_request": {
          const permData = data as unknown as PermissionRequestData;
          // Use server-generated request_id for pipe-based correlation,
          // falling back to random UUID for backward compatibility.
          const requestId = (data as Record<string, unknown>).request_id as string || crypto.randomUUID();
          addPermissionRequest({
            id: requestId,
            operation: permData.operation,
            target: permData.target,
            reason: permData.reason,
            timestamp: Date.now(),
            sessionId: session_id,
          });
          startPermissionTimeout(requestId);
          setStatus("waiting", "等待权限批准");
          if (soundEnabled) playApprovalSound(soundVolume);
          break;
        }

        case "status_change": {
          const statusData = data as unknown as StatusChangeData;
          setStatus(statusData.status as SpriteStatus, statusData.message);
          break;
        }

        case "ai_response": {
          const aiData = data as unknown as AiResponseData;
          setStatus("active", "AI 已回复");
          if (aiData?.content) {
            addChatMessage({ role: "assistant", content: aiData.content, timestamp: Date.now() });
          }
          if (soundEnabled) playCompleteSound(soundVolume);
          break;
        }

        case "user_prompt": {
          const promptData = data as unknown as UserPromptData;
          setStatus("active", "用户发送消息");
          addChatMessage({ role: "user", content: promptData.prompt, timestamp: Date.now() });
          break;
        }

        case "subagent_start":
          setStatus("working", "子智能体启动");
          break;

        case "subagent_stop":
          setStatus("active", "子智能体完成");
          break;

        case "permission_denied":
          setStatus("active", "权限被拒绝");
          break;
      }
    });

    return () => {
      if (heartbeatRef.current) clearTimeout(heartbeatRef.current);
      clearAllPermissionTimeouts();
      unlisten.then((fn) => fn());
    };
  }, [ensureSession, setActiveSession, setStatus, addToolCall, addPermissionRequest, startPermissionTimeout, addChatMessage, clearAllPermissionTimeouts]);

  useEffect(() => {
    const unlisten = listen<null>("settings-changed", () => {
      loadSettings();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [loadSettings]);
}
