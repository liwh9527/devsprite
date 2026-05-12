import React from "react";
import type { PermissionRequest } from "../types";

interface PermissionDialogProps {
  request: PermissionRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export const PermissionDialog: React.FC<PermissionDialogProps> = ({
  request,
  onApprove,
  onReject,
}) => {
  return (
    <div className="px-4 py-3">
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <p className="text-sm font-medium text-yellow-800 mb-2">
          权限请求
        </p>
        <p className="text-xs text-yellow-600 mb-3">
          {request.operation}: {request.target}
        </p>
        {request.reason && (
          <p className="text-xs text-yellow-500 mb-3">
            原因: {request.reason}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => onApprove(request.id)}
            className="flex-1 bg-green-500 text-white text-sm font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
          >
            ✓ 批准
          </button>
          <button
            onClick={() => onReject(request.id)}
            className="flex-1 bg-white text-red-500 text-sm font-semibold py-2 px-4 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
          >
            ✗ 拒绝
          </button>
        </div>
      </div>
    </div>
  );
};
