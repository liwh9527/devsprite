import React, { useEffect, useState } from "react";
import type { PermissionRequest } from "../types";
import { useAppStore } from "../stores/appStore";

interface PermissionDialogProps {
  request: PermissionRequest;
  timeout?: number;
  queueLength?: number;
}

export const PermissionDialog: React.FC<PermissionDialogProps> = ({ request, timeout = 30, queueLength }) => {
  const { respondToPermission } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [remaining, setRemaining] = useState(timeout);

  useEffect(() => {
    const elapsed = Math.floor((Date.now() - request.timestamp) / 1000);
    setRemaining(Math.max(0, timeout - elapsed));

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - request.timestamp) / 1000);
      setRemaining(Math.max(0, timeout - elapsed));
    }, 1000);

    return () => clearInterval(timer);
  }, [request.timestamp, timeout]);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await respondToPermission(request.id, true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await respondToPermission(request.id, false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="px-3 py-2">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
        <p className="text-[10px] font-medium text-yellow-800 mb-1">
          权限请求
        </p>
        <p className="text-[9px] text-yellow-600 mb-1 truncate">
          <span className="font-semibold">操作:</span> {request.operation}
        </p>
        <p className="text-[9px] text-yellow-600 mb-1 truncate">
          <span className="font-semibold">目标:</span> {request.target}
        </p>
        {request.reason && (
          <p className="text-[9px] text-yellow-500 mb-2 truncate">
            <span className="font-semibold">原因:</span> {request.reason}
          </p>
        )}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-yellow-500">
            {remaining > 0 ? `${remaining}s 后自动拒绝` : "已超时"}
          </span>
          <div className="w-16 h-1 bg-yellow-200 rounded overflow-hidden">
            <div
              className="h-full bg-yellow-500 transition-all duration-1000"
              style={{ width: `${(remaining / timeout) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={handleApprove}
            disabled={isLoading}
            className="flex-1 bg-green-500 text-white text-[10px] font-semibold py-1 px-2 rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "处理中..." : "批准"}
          </button>
          <button
            onClick={handleReject}
            disabled={isLoading}
            className="flex-1 bg-white text-red-500 text-[10px] font-semibold py-1 px-2 rounded border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "处理中..." : "拒绝"}
          </button>
        </div>
        {queueLength && queueLength > 1 && (
          <p className="text-[9px] text-gray-400 text-center mt-1">
            还有 {queueLength - 1} 个待处理
          </p>
        )}
      </div>
    </div>
  );
};
