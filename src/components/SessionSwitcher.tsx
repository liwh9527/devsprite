import React from "react";
import { useAppStore } from "../stores/appStore";

export const SessionSwitcher: React.FC = () => {
  const sessions = useAppStore((state) => state.sessions);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const setActiveSession = useAppStore((state) => state.setActiveSession);

  const sessionList = Array.from(sessions.values());

  // Only show when there are multiple sessions
  if (sessionList.length <= 1) return null;

  return (
    <div className="px-3 py-1 border-b border-gray-100">
      <div className="flex gap-1 overflow-x-auto">
        {sessionList.map((session) => (
          <button
            key={session.sessionId}
            onClick={() => setActiveSession(session.sessionId)}
            className={`text-[9px] px-2 py-0.5 rounded-full transition-colors ${
              session.sessionId === activeSessionId
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {session.sessionId.slice(0, 8)}
            {session.permissionRequests.length > 0 && session.sessionId !== activeSessionId && (
              <span className="ml-1 w-1.5 h-1.5 bg-red-500 rounded-full inline-block" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
