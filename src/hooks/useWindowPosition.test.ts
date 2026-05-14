import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWindowPosition } from "./useWindowPosition";

const mockOnMoved = vi.fn();
const mockInvoke = vi.fn();

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => ({
    startDragging: vi.fn(),
    onMoved: (...args: any[]) => mockOnMoved(...args),
  })),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

describe("useWindowPosition", () => {
  let movedCallback: (event: any) => void;

  beforeEach(() => {
    vi.useFakeTimers();
    mockOnMoved.mockImplementation((callback: (event: any) => void) => {
      movedCallback = callback;
      return Promise.resolve(vi.fn());
    });
    mockInvoke.mockResolvedValue(undefined);
    vi.clearAllMocks();
    // Re-setup after clearAllMocks
    mockOnMoved.mockImplementation((callback: (event: any) => void) => {
      movedCallback = callback;
      return Promise.resolve(vi.fn());
    });
    mockInvoke.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should register onMoved listener", () => {
    renderHook(() => useWindowPosition());
    expect(mockOnMoved).toHaveBeenCalled();
  });

  it("should save position after debounce when window is moved", () => {
    renderHook(() => useWindowPosition());

    movedCallback({ payload: { x: 200, y: 300 } });
    vi.advanceTimersByTime(500);

    expect(mockInvoke).toHaveBeenCalledWith("set_window_position", {
      x: 200,
      y: 300,
    });
  });

  it("should debounce multiple move events", () => {
    renderHook(() => useWindowPosition());

    movedCallback({ payload: { x: 200, y: 300 } });
    movedCallback({ payload: { x: 250, y: 350 } });
    vi.advanceTimersByTime(500);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith("set_window_position", {
      x: 250,
      y: 350,
    });
  });

  it("should not invoke before debounce period", () => {
    renderHook(() => useWindowPosition());

    movedCallback({ payload: { x: 200, y: 300 } });
    vi.advanceTimersByTime(400);

    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
