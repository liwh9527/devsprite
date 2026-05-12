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
    <div className="px-3 py-2">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
        <p className="text-[10px] font-medium text-yellow-800 mb-1">
          权限请求
        </p>
        <p className="text-[9px] text-yellow-600 mb-2 truncate">
          {request.operation}: {request.target}
        </p>
        <div className="flex gap-1.5">
          <button
            onClick={() => onApprove(request.id)}
            className="flex-1 bg-green-500 text-white text-[10px] font-semibold py-1 px-2 rounded hover:bg-green-600 transition-colors"
          >
            批准
          </button>
          <button
            onClick={() => onReject(request.id)}
            className="flex-1 bg-white text-red-500 text-[10px] font-semibold py-1 px-2 rounded border border-red-200 hover:bg-red-50 transition-colors"
          >
            拒绝
          </button>
        </div>
      </div>
    </div>
  );
};
