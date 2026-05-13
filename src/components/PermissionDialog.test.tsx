import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PermissionDialog } from "./PermissionDialog";
import { useAppStore } from "../stores/appStore";
import type { PermissionRequest } from "../types";

// Mock @tauri-apps/api/core
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

const mockRequest: PermissionRequest = {
  id: "perm-1",
  operation: "Read",
  target: "/secret/file.rs",
  reason: "Needs read access",
  timestamp: Date.now(),
};

describe("PermissionDialog", () => {
  beforeEach(() => {
    useAppStore.setState({
      status: "idle",
      statusMessage: "",
      sessionId: null,
      toolCalls: [],
      permissionRequests: [mockRequest],
      isWidgetVisible: true,
      pendingResponses: [],
    });
  });

  it("should display operation and target", () => {
    const { container } = render(<PermissionDialog request={mockRequest} />);
    // Operation and target are rendered in separate <p> elements with spans for labels
    // The text is split across elements, so check the container HTML for the values
    expect(container.textContent).toContain("Read");
    expect(container.textContent).toContain("/secret/file.rs");
  });

  it("should display reason when present", () => {
    render(<PermissionDialog request={mockRequest} />);
    expect(screen.getByText("Needs read access", { exact: false })).toBeInTheDocument();
  });

  it("should call respondToPermission with true on approve", async () => {
    const spy = vi.spyOn(useAppStore.getState(), "respondToPermission");
    render(<PermissionDialog request={mockRequest} />);
    fireEvent.click(screen.getByText("批准"));
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith("perm-1", true);
    });
    spy.mockRestore();
  });

  it("should call respondToPermission with false on reject", async () => {
    const spy = vi.spyOn(useAppStore.getState(), "respondToPermission");
    render(<PermissionDialog request={mockRequest} />);
    fireEvent.click(screen.getByText("拒绝"));
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith("perm-1", false);
    });
    spy.mockRestore();
  });
});
