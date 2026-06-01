# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
npm install                    # Install frontend dependencies
npm run tauri dev              # Dev mode with hot reload (requires Rust toolchain)
npm run tauri build            # Production build → src-tauri/target/release/devsprite.exe
npm test                       # Run all Vitest tests
npm test -- src/stores/appStore.test.ts  # Run single test file
npm run test:watch             # Vitest watch mode
npm run test:coverage          # Coverage report (v8 provider)
cd src-tauri && cargo test     # Run Rust unit tests (requires Windows + Rust)
```

## Architecture

DevSprite is a Windows desktop pet that monitors Claude Code's status via Named Pipe IPC.

**Data flow:**
```
Events:  Claude Code → Hook scripts (pipe-hook.ps1) → Named Pipe → Rust backend → Tauri Events → React frontend
Permissions: Claude Code ← Hook scripts ← Named Pipe ← Rust backend ← React frontend (user clicks approve/deny)
```

**Backend (Rust/Tauri) — `src-tauri/src/`:**
- `lib.rs` — App entry: sets up Named Pipe listener (duplex), global hotkey, Tauri event bridge, managed state, PendingPermissionStore
- `logger.rs` — log4rs configuration: console + file appender with size-based rotation (5MB, 5 archives)
- `ipc/named_pipe.rs` — Windows Named Pipe server (PIPE_ACCESS_DUPLEX) with exponential backoff retry, bidirectional permission handling via oneshot channels
- `ipc/events.rs` — `DevSpriteEvent` parsing + typed data extraction (`parse_tool_call`, `parse_permission_request`, etc.)
- `ipc/response_store.rs` — Permission response persistence to `%APPDATA%/devsprite/responses.json` (audit trail)
- `settings.rs` — Unified Settings (WindowSettings, PipeSettings, ThemeSettings, BehaviorSettings) with validation and persistence
- `commands.rs` — Tauri commands (`get_settings`, `update_settings`, `respond_permission` with pipe response, window position); `AppState` shared state
- `tray.rs` — System tray with show/hide/quit menu

**Frontend (React/TypeScript) — `src/`:**
- `stores/appStore.ts` — Zustand store: status, tool calls (max configurable), permission requests/responses with timeout auto-deny, settings state, theme application
- `hooks/useTauriEvent.ts` — Listens to `devsprite-event` Tauri events, dispatches to store, starts permission timeout timers
- `hooks/useWindowPosition.ts` — Debounced window position save on drag (500ms)
- `components/` — Mascot (status-based images + CSS `mascot-{status}` class animations), StatusCard, ToolList, PermissionDialog, SettingsPanel, Widget (hover panel)

**Hook scripts — `scripts/`:**
- `pipe-hook.ps1` — Reads Claude Code hook stdin, maps to DevSprite event format, writes to Named Pipe. For PermissionRequest events, uses bidirectional pipe communication (InOut) to receive the user's response.
- `install-hooks.ps1` — Writes hook config to `~/.claude/settings.json`

## Platform Constraints

- **Windows-only**: `named_pipe.rs` and `tray.rs` use Windows APIs (`windows` crate). Code will not compile on macOS/Linux.
- `response_store.rs` and `persistence.rs` use `APPDATA` env var for file storage (Windows convention).
- Frontend tests use `src/__mocks__/@tauri-apps/` to mock all Tauri API calls, so they run on any platform.
- Rust tests for platform-independent modules (events, response_store, persistence, config, commands) should work on any OS, but `cargo test` will fail on non-Windows due to `named_pipe.rs` and `tray.rs` compilation.

## Testing

- Frontend: Vitest + @testing-library/react + jsdom. Tauri APIs are mocked via `src/__mocks__/`.
- Rust: `#[cfg(test)]` inline tests in each module. Platform-specific tests use `#[cfg(windows)]` conditionals.
- `crypto.randomUUID()` is used in `useTauriEvent.ts` — jsdom test setup includes a polyfill.

## Key Design Decisions

- Permission responses use bidirectional Named Pipe (PIPE_ACCESS_DUPLEX): hook script connects InOut, sends request, server holds connection, writes response back when user decides. Fail-open: defaults to approved on timeout/error.
- Permission requests auto-deny in UI after `behavior.permission_timeout` seconds (default 30s), but fail-open in hook script after 30s read timeout (P0-3 safety net).
- Permission request IDs are generated server-side (monotonic counter) and included in Tauri events for frontend correlation.
- The desktop pet widget is always-on-top, frameless (`decorations: false`), with hover-to-show info panel.
- Global hotkey (`Ctrl+Shift+D` by default, configurable via `behavior.hotkey`) toggles window visibility using `tauri-plugin-global-shortcut`.
- Named Pipe creation retries with exponential backoff (1s→2s→4s, configurable via `pipe.max_retries`).
- Window position auto-saves on drag via `useWindowPosition` hook with 500ms debounce.
- Mascot animations are CSS `@keyframes` with `mascot-{status}` class names applied dynamically — one animation per status with distinct motion characteristics.
- Logs rotate at 5MB with 5 archived files, stored in `%APPDATA%/devsprite/logs/`.
- Settings are unified in `settings.rs` with typed structs and file I/O at `%APPDATA%/devsprite/settings.json`.
