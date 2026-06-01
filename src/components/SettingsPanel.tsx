import React, { useState, useEffect } from "react";
import { useAppStore } from "../stores/appStore";
import type { Settings, ThemeSettings, BehaviorSettings, PipeSettings } from "../types";

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const { settings, updateSettings } = useAppStore();
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleThemeChange = (key: keyof ThemeSettings, value: string | number) => {
    setLocalSettings((prev) => ({
      ...prev,
      theme: { ...prev.theme, [key]: value },
    }));
  };

  const handleBehaviorChange = (key: keyof BehaviorSettings, value: number | string | null) => {
    setLocalSettings((prev) => ({
      ...prev,
      behavior: { ...prev.behavior, [key]: value },
    }));
  };

  const handlePipeChange = (key: keyof PipeSettings, value: string | number) => {
    setLocalSettings((prev) => ({
      ...prev,
      pipe: { ...prev.pipe, [key]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await updateSettings(localSettings);
    setSaving(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.error || "保存失败");
    }
  };

  const handleReset = () => {
    if (!window.confirm("确定要恢复默认设置吗？所有自定义配置将丢失。")) {
      return;
    }
    const defaults: Settings = {
      window: { x: 100, y: 100, visible: true, width: 220, height: 580 },
      pipe: { name: "devsprite", buffer_size: 4096, connect_timeout: 3000, max_retries: 3 },
      theme: {
        primary_color: "#667eea",
        primary_dark_color: "#764ba2",
        panel_width: 200,
        panel_background_opacity: 0.95,
        panel_border_radius: 12,
      },
      behavior: { max_tool_calls: 5, permission_timeout: 30, mascot_path: null, hotkey: "Ctrl+Shift+D" },
    };
    setLocalSettings(defaults);
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-xl shadow-2xl w-80 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-bold text-sm">设置</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Theme Section */}
        <div className="px-4 py-3 border-b">
          <h3 className="text-xs font-semibold text-gray-500 mb-2">🎨 外观</h3>
          <div className="space-y-2">
            <label className="flex items-center justify-between text-xs">
              <span>主色调</span>
              <input
                type="color"
                value={localSettings.theme.primary_color}
                onChange={(e) => handleThemeChange("primary_color", e.target.value)}
                className="w-8 h-6 rounded cursor-pointer border-0"
              />
            </label>
            <label className="flex items-center justify-between text-xs">
              <span>辅助色</span>
              <input
                type="color"
                value={localSettings.theme.primary_dark_color}
                onChange={(e) => handleThemeChange("primary_dark_color", e.target.value)}
                className="w-8 h-6 rounded cursor-pointer border-0"
              />
            </label>
            <label className="flex items-center justify-between text-xs">
              <span>面板宽度</span>
              <input
                type="range"
                min={160}
                max={300}
                value={localSettings.theme.panel_width}
                onChange={(e) => handleThemeChange("panel_width", Number(e.target.value))}
                className="w-24"
              />
              <span className="w-10 text-right">{localSettings.theme.panel_width}px</span>
            </label>
            <label className="flex items-center justify-between text-xs">
              <span>圆角大小</span>
              <input
                type="range"
                min={0}
                max={24}
                value={localSettings.theme.panel_border_radius}
                onChange={(e) => handleThemeChange("panel_border_radius", Number(e.target.value))}
                className="w-24"
              />
              <span className="w-10 text-right">{localSettings.theme.panel_border_radius}px</span>
            </label>
            <label className="flex items-center justify-between text-xs">
              <span>背景透明度</span>
              <input
                type="range"
                min={50}
                max={100}
                value={Math.round(localSettings.theme.panel_background_opacity * 100)}
                onChange={(e) =>
                  handleThemeChange("panel_background_opacity", Number(e.target.value) / 100)
                }
                className="w-24"
              />
              <span className="w-10 text-right">
                {Math.round(localSettings.theme.panel_background_opacity * 100)}%
              </span>
            </label>
          </div>
        </div>

        {/* Behavior Section */}
        <div className="px-4 py-3 border-b">
          <h3 className="text-xs font-semibold text-gray-500 mb-2">⚙️ 行为</h3>
          <div className="space-y-2">
            <label className="flex items-center justify-between text-xs">
              <span>工具显示数</span>
              <input
                type="range"
                min={3}
                max={10}
                value={localSettings.behavior.max_tool_calls}
                onChange={(e) => handleBehaviorChange("max_tool_calls", Number(e.target.value))}
                className="w-24"
              />
              <span className="w-10 text-right">{localSettings.behavior.max_tool_calls}</span>
            </label>
            <label className="flex items-center justify-between text-xs">
              <span>权限超时</span>
              <input
                type="range"
                min={5}
                max={60}
                value={localSettings.behavior.permission_timeout}
                onChange={(e) => handleBehaviorChange("permission_timeout", Number(e.target.value))}
                className="w-24"
              />
              <span className="w-10 text-right">{localSettings.behavior.permission_timeout}s</span>
            </label>
            <label className="flex items-center justify-between text-xs">
              <span>快捷键</span>
              <input
                type="text"
                value={localSettings.behavior.hotkey}
                onChange={(e) => handleBehaviorChange("hotkey", e.target.value)}
                className="w-24 text-right text-xs border rounded px-1 py-0.5"
                placeholder="Ctrl+Shift+D"
              />
            </label>
          </div>
        </div>

        {/* Pipe Section */}
        <div className="px-4 py-3 border-b">
          <h3 className="text-xs font-semibold text-gray-500 mb-2">📡 连接 <span className="text-xs font-normal text-amber-500">（重启后生效）</span></h3>
          <label className="flex items-center justify-between text-xs">
            <span>管道名称</span>
            <input
              type="text"
              value={localSettings.pipe.name}
              onChange={(e) => handlePipeChange("name", e.target.value)}
              className="w-24 text-right text-xs border rounded px-1 py-0.5"
            />
          </label>
          <label className="flex items-center justify-between text-xs">
            <span>重试次数</span>
            <input
              type="range"
              min={1}
              max={10}
              value={localSettings.pipe.max_retries}
              onChange={(e) => handlePipeChange("max_retries", Number(e.target.value))}
              className="w-24"
            />
            <span className="w-10 text-right">{localSettings.pipe.max_retries}</span>
          </label>
          <label className="flex items-center justify-between text-xs">
            <span>缓冲区</span>
            <input
              type="range"
              min={1024}
              max={65536}
              step={1024}
              value={localSettings.pipe.buffer_size}
              onChange={(e) => handlePipeChange("buffer_size", Number(e.target.value))}
              className="w-24"
            />
            <span className="w-10 text-right">{localSettings.pipe.buffer_size}</span>
          </label>
          <label className="flex items-center justify-between text-xs">
            <span>连接超时</span>
            <input
              type="range"
              min={1000}
              max={10000}
              step={100}
              value={localSettings.pipe.connect_timeout}
              onChange={(e) => handlePipeChange("connect_timeout", Number(e.target.value))}
              className="w-24"
            />
            <span className="w-10 text-right">{localSettings.pipe.connect_timeout}ms</span>
          </label>
        </div>

        {/* Footer */}
        {error && (
          <p className="text-[10px] text-red-500 px-4 pb-2">{error}</p>
        )}
        <div className="flex items-center justify-end gap-2 px-4 py-3">
          <button
            onClick={handleReset}
            className="text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50"
          >
            恢复默认
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
            style={{
              background: `linear-gradient(to right, var(--color-primary), var(--color-primary-dark))`,
            }}
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
};