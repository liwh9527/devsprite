type UnlistenFn = () => void;

export const listen = vi.fn<Promise<UnlistenFn>, [string, (event: any) => void]>(
  () => Promise.resolve(vi.fn() as unknown as UnlistenFn)
);
