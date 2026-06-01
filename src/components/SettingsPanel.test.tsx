import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsPanel } from "./SettingsPanel";
import { useAppStore } from "../stores/appStore";
import { invoke } from "@tauri-apps/api/core";

const mockInvoke = invoke as ReturnType<typeof vi.fn>;
const mockOnClose = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("SettingsPanel", () => {
  beforeEach(() => {
    useAppStore.setState({
      sessions: new Map(),
      activeSessionId: null,
      pendingResponses: [],
      settings: {
        window: { x: 100, y: 100, visible: true, width: 220, height: 580 },
        pipe: { name: "devsprite", buffer_size: 4096, connect_timeout: 3000, max_retries: 3 },
        theme: {
          primary_color: "#667eea",
          primary_dark_color: "#764ba2",
          panel_width: 200,
          panel_background_opacity: 0.95,
          panel_border_radius: 12,
        },
        behavior: { max_tool_calls: 5, permission_timeout: 30, hotkey: "Ctrl+Shift+D" },
      },
    });
    vi.clearAllMocks();
  });

  it("should render settings sections", () => {
    render(<SettingsPanel onClose={mockOnClose} />);
    expect(screen.getByText("设置")).toBeDefined();
    // Section headers contain emojis, so use partial match
    expect(screen.getByText(/外观/)).toBeDefined();
    expect(screen.getByText(/行为/)).toBeDefined();
    expect(screen.getByText(/📡 连接/)).toBeDefined();
  });

  it("should call onClose when close button clicked", () => {
    render(<SettingsPanel onClose={mockOnClose} />);
    fireEvent.click(screen.getByText("✕"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should reset to defaults when reset button clicked", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<SettingsPanel onClose={mockOnClose} />);

    const sliders = screen.getAllByRole("slider");
    fireEvent.change(sliders[0], { target: { value: "250" } });
    expect(sliders[0]).toHaveValue("250");

    fireEvent.click(screen.getByText("恢复默认"));
    expect(sliders[0]).toHaveValue("200");
  });

  it("should display pipe section with restart notice", () => {
    render(<SettingsPanel onClose={mockOnClose} />);
    expect(screen.getByText(/重启后生效/)).toBeDefined();
  });

  it("should save settings when save button clicked", async () => {
    mockInvoke.mockResolvedValue(undefined);

    render(<SettingsPanel onClose={mockOnClose} />);
    fireEvent.click(screen.getByText("保存"));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("update_settings", expect.any(Object));
    });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should display color picker labels", () => {
    render(<SettingsPanel onClose={mockOnClose} />);
    expect(screen.getByText("主色调")).toBeDefined();
    expect(screen.getByText("辅助色")).toBeDefined();
  });

  it("should show correct initial slider values", () => {
    render(<SettingsPanel onClose={mockOnClose} />);

    const sliders = screen.getAllByRole("slider");
    // Order: panel_width(0), border_radius(1), opacity(2), max_tool_calls(3), permission_timeout(4), max_retries(5)
    expect(sliders[0]).toHaveValue("200");
    expect(sliders[1]).toHaveValue("12");
    expect(sliders[2]).toHaveValue("95");   // opacity = 0.95 * 100
    expect(sliders[3]).toHaveValue("5");    // max_tool_calls
    expect(sliders[4]).toHaveValue("30");   // permission_timeout
    expect(sliders[5]).toHaveValue("3");    // max_retries
  });

  it("should update slider value on change", () => {
    render(<SettingsPanel onClose={mockOnClose} />);

    const sliders = screen.getAllByRole("slider");
    // Change max_tool_calls slider (index 3)
    fireEvent.change(sliders[3], { target: { value: "8" } });
    expect(sliders[3]).toHaveValue("8");
  });

  it("should update pipe name on text input change", () => {
    render(<SettingsPanel onClose={mockOnClose} />);

    const textInputs = screen.getAllByRole("textbox");
    const pipeInput = textInputs[textInputs.length - 1];
    fireEvent.change(pipeInput, { target: { value: "mypipe" } });
    expect(pipeInput).toHaveValue("mypipe");
  });

  it("should display hotkey input with default value", () => {
    render(<SettingsPanel onClose={mockOnClose} />);

    const textInputs = screen.getAllByRole("textbox");
    const hotkeyInput = textInputs.find(
      (input) => (input as HTMLInputElement).value === "Ctrl+Shift+D"
    );
    expect(hotkeyInput).toBeDefined();
  });

  it("should update hotkey on text input change", () => {
    render(<SettingsPanel onClose={mockOnClose} />);

    const textInputs = screen.getAllByRole("textbox");
    const hotkeyInput = textInputs.find(
      (input) => (input as HTMLInputElement).value === "Ctrl+Shift+D"
    )!;

    fireEvent.change(hotkeyInput, { target: { value: "Ctrl+Alt+D" } });
    expect(hotkeyInput).toHaveValue("Ctrl+Alt+D");
  });
});