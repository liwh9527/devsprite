export const getCurrentWindow = vi.fn(() => ({
  startDragging: vi.fn(),
  show: vi.fn(),
  hide: vi.fn(),
  isVisible: vi.fn(() => Promise.resolve(true)),
}));
