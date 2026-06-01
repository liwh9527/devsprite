use tauri::command;
use tauri::AppHandle;
use tauri::Emitter;
use crate::ipc::{PermissionResponse, ResponseStore};
use crate::PendingPermissionStore;
use crate::settings::{self, Settings};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Resolves the scripts directory relative to the current exe.
/// Falls back to current working directory if exe path is unavailable.
fn find_scripts_dir() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let exe_dir = exe.parent()?;
    let scripts = exe_dir.join("scripts");
    if scripts.is_dir() {
        return Some(scripts);
    }
    // Fallback: check CWD
    let cwd_scripts = std::env::current_dir().ok()?.join("scripts");
    if cwd_scripts.is_dir() {
        return Some(cwd_scripts);
    }
    None
}

pub struct AppState {
    pub settings: Settings,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            settings: Settings::default(),
        }
    }
}

#[command]
pub fn get_settings(state: tauri::State<'_, Arc<Mutex<AppState>>>) -> Settings {
    let state = state.blocking_lock();
    state.settings.clone()
}

#[command]
pub fn update_settings(
    settings: Settings,
    state: tauri::State<'_, Arc<Mutex<AppState>>>,
    app: AppHandle,
) -> Result<(), String> {
    settings.validate()
        .map_err(|errors| format!("Validation failed: {}", errors.iter().map(|e| e.to_string()).collect::<Vec<_>>().join(", ")))?;

    crate::settings::save_settings(&settings)
        .map_err(|e| format!("Failed to save settings: {}", e))?;

    {
        let mut state = state.blocking_lock();
        state.settings = settings;
    }

    app.emit("settings-changed", ())
        .map_err(|e| format!("Failed to emit settings-changed event: {}", e))?;

    Ok(())
}

#[command]
pub fn get_status(state: tauri::State<'_, Arc<Mutex<AppState>>>) -> String {
    let _state = state.blocking_lock();
    "idle".to_string()
}

#[command]
pub fn toggle_widget(state: tauri::State<'_, Arc<Mutex<AppState>>>) -> bool {
    let mut guard = state.blocking_lock();
    guard.settings.window.visible = !guard.settings.window.visible;
    let visible = guard.settings.window.visible;
    let settings_copy = guard.settings.clone();
    drop(guard);

    // Best-effort save; if it fails we still return the toggled value
    let _ = settings::save_settings(&settings_copy);

    visible
}

/// Handles a permission response from the frontend.
///
/// Primary path: if a pending pipe-based response handle exists (from a
/// PermissionRequest event), sends the response back through the named pipe
/// to the hook script. This is the low-latency bidirectional path.
///
/// Audit path: always stores the response in ResponseStore for logging.
#[command]
pub fn respond_permission(
    request_id: String,
    session_id: String,
    approved: bool,
    store: tauri::State<'_, Arc<ResponseStore>>,
    pending_store: tauri::State<'_, Arc<PendingPermissionStore>>,
) -> Result<(), String> {
    // Try pipe-based response first (bidirectional communication).
    if let Some(sender) = pending_store.take(&request_id) {
        let response = serde_json::json!({
            "approved": approved,
            "request_id": request_id,
        });
        if sender.send(response.to_string()).is_ok() {
            log::info!(
                "Permission response sent via pipe: request_id={}, approved={}",
                request_id,
                approved
            );
        } else {
            log::warn!(
                "Failed to send permission response through pipe for {}",
                request_id
            );
        }
    } else {
        log::debug!(
            "No pending pipe handle for {}, storing in ResponseStore only",
            request_id
        );
    }

    // Always store in ResponseStore for audit trail / backward compatibility.
    let response = PermissionResponse {
        request_id: request_id.clone(),
        session_id: session_id.clone(),
        approved,
        timestamp: chrono::Utc::now().timestamp(),
    };

    store
        .store_response(response)
        .map_err(|e| format!("Failed to store response: {}", e))?;

    log::info!(
        "Permission response processed: request_id={}, approved={}",
        request_id,
        approved
    );
    Ok(())
}

#[command]
pub fn get_window_position(state: tauri::State<'_, Arc<Mutex<AppState>>>) -> (i32, i32) {
    let state = state.blocking_lock();
    (state.settings.window.x, state.settings.window.y)
}

#[command]
pub fn set_window_position(
    x: i32,
    y: i32,
    state: tauri::State<'_, Arc<Mutex<AppState>>>
) {
    let mut guard = state.blocking_lock();
    guard.settings.window.x = x;
    guard.settings.window.y = y;
    let settings_copy = guard.settings.clone();
    drop(guard);

    // Best-effort save after position update
    let _ = settings::save_settings(&settings_copy);
}

// ---------------------------------------------------------------------------
// Hook management commands
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Auto-launch management commands
// ---------------------------------------------------------------------------

const REGISTRY_PATH: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
const APP_NAME: &str = "DevSprite";

/// Enables or disables auto-launch at Windows login via the registry.
#[command]
pub fn set_auto_launch(enabled: bool) -> Result<(), String> {
    let hkcu = winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER);
    let (key, _) = hkcu
        .create_subkey(REGISTRY_PATH)
        .map_err(|e| format!("Failed to open registry: {}", e))?;

    if enabled {
        let exe_path =
            std::env::current_exe().map_err(|e| format!("Cannot get exe path: {}", e))?;
        key.set_value(APP_NAME, &exe_path.to_string_lossy().to_string())
            .map_err(|e| format!("Failed to set registry value: {}", e))?;
        log::info!("Auto-launch enabled: {}", exe_path.display());
    } else {
        let _ = key.delete_value(APP_NAME); // Ignore if not exists
        log::info!("Auto-launch disabled");
    }

    Ok(())
}

/// Checks whether auto-launch is currently enabled in the Windows registry.
#[command]
pub fn get_auto_launch() -> bool {
    let hkcu = winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER);
    if let Ok(key) = hkcu.open_subkey_with_flags(REGISTRY_PATH, winreg::enums::KEY_READ) {
        key.get_value::<String, _>(APP_NAME).is_ok()
    } else {
        false
    }
}

/// Checks whether DevSprite hooks are currently installed in Claude Code settings.
/// Returns true if DevSprite hook entries exist in ~/.claude/settings.json.
#[command]
pub fn check_hooks_installed() -> Result<bool, String> {
    let home = std::env::var("USERPROFILE")
        .map_err(|_| "Cannot determine USERPROFILE directory")?;
    let settings_path = std::path::PathBuf::from(home)
        .join(".claude")
        .join("settings.json");

    if !settings_path.exists() {
        return Ok(false);
    }

    let content = std::fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings.json: {}", e))?;

    // Simple check: look for pipe-hook.ps1 marker in the file
    Ok(content.contains("pipe-hook.ps1"))
}

/// Installs DevSprite hooks into ~/.claude/settings.json.
/// Runs the PowerShell install script. Idempotent - skips if already installed.
#[command]
pub fn install_hooks() -> Result<String, String> {
    let scripts_dir = find_scripts_dir()
        .ok_or("Cannot locate DevSprite scripts directory")?;
    let script = scripts_dir.join("install-hooks.ps1");

    if !script.exists() {
        return Err(format!("Install script not found: {}", script.display()));
    }

    let output = std::process::Command::new("powershell")
        .args([
            "-ExecutionPolicy", "Bypass",
            "-NoProfile",
            "-File", script.to_str().unwrap_or(""),
        ])
        .output()
        .map_err(|e| format!("Failed to run install script: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() {
        log::error!("Hook install failed: {} {}", stdout, stderr);
        return Err(format!("Install failed (exit {}): {}", output.status.code().unwrap_or(-1), stderr));
    }

    log::info!("Hook install output: {}", stdout);
    Ok(stdout)
}

/// Removes only DevSprite hooks from ~/.claude/settings.json.
/// Preserves all other tools' hooks.
#[command]
pub fn uninstall_hooks() -> Result<String, String> {
    let scripts_dir = find_scripts_dir()
        .ok_or("Cannot locate DevSprite scripts directory")?;
    let script = scripts_dir.join("uninstall-hooks.ps1");

    if !script.exists() {
        return Err(format!("Uninstall script not found: {}", script.display()));
    }

    let output = std::process::Command::new("powershell")
        .args([
            "-ExecutionPolicy", "Bypass",
            "-NoProfile",
            "-File", script.to_str().unwrap_or(""),
        ])
        .output()
        .map_err(|e| format!("Failed to run uninstall script: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() {
        log::error!("Hook uninstall failed: {} {}", stdout, stderr);
        return Err(format!("Uninstall failed (exit {}): {}", output.status.code().unwrap_or(-1), stderr));
    }

    log::info!("Hook uninstall output: {}", stdout);
    Ok(stdout)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_state_default() {
        let state = AppState::default();
        assert_eq!(state.settings.window.x, 100);
        assert_eq!(state.settings.window.y, 100);
        assert_eq!(state.settings.pipe.name, "devsprite");
        assert_eq!(state.settings.window.visible, true);
    }

    #[test]
    fn test_toggle_widget() {
        let mut state = AppState::default();
        assert!(state.settings.window.visible);
        state.settings.window.visible = !state.settings.window.visible;
        assert!(!state.settings.window.visible);
        state.settings.window.visible = !state.settings.window.visible;
        assert!(state.settings.window.visible);
    }

    #[test]
    fn test_window_position() {
        let mut state = AppState::default();
        state.settings.window.x = 200;
        state.settings.window.y = 300;
        assert_eq!(state.settings.window.x, 200);
        assert_eq!(state.settings.window.y, 300);
    }

    #[test]
    fn test_pending_permission_store() {
        use crate::PendingPermissionStore;
        let store = PendingPermissionStore::new();
        let (tx, _rx) = tokio::sync::oneshot::channel();
        store.insert("test-req-1".to_string(), tx);
        assert!(store.take("test-req-1").is_some());
        assert!(store.take("test-req-1").is_none());
    }

    #[test]
    fn test_pending_permission_store_miss() {
        let store = PendingPermissionStore::new();
        assert!(store.take("nonexistent").is_none());
    }

    #[test]
    fn test_find_scripts_dir_cwd_fallback() {
        // In dev mode, scripts/ is at the project root
        let result = find_scripts_dir();
        // Should find scripts dir from CWD fallback (project root has scripts/)
        if let Some(dir) = result {
            assert!(dir.join("pipe-hook.ps1").exists() || dir.join("install-hooks.ps1").exists());
        }
    }

    #[test]
    fn test_check_hooks_installed_no_settings() {
        // Temporarily set USERPROFILE to a non-existent path
        let orig = std::env::var("USERPROFILE").ok();
        std::env::set_var("USERPROFILE", &std::env::temp_dir().join("devsprite_test_noexist"));

        let result = check_hooks_installed();

        // Restore
        match orig {
            Some(v) => std::env::set_var("USERPROFILE", v),
            None => { let _ = std::env::remove_var("USERPROFILE"); }
        }

        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[test]
    fn test_check_hooks_installed_with_devsprite_hooks() {
        use std::fs;
        let temp_dir = std::env::temp_dir().join("devsprite_test_hooks_check");
        let _ = fs::create_dir_all(temp_dir.join(".claude"));
        let settings_path = temp_dir.join(".claude").join("settings.json");

        // Write settings with DevSprite hooks
        let settings_json = r#"{
            "hooks": {
                "PreToolUse": [{
                    "matcher": "*",
                    "hooks": [{
                        "type": "command",
                        "command": "powershell",
                        "args": ["-ExecutionPolicy", "Bypass", "-File", "C:\\scripts\\pipe-hook.ps1", "-Event", "PreToolUse"],
                        "timeout": 5
                    }]
                }]
            }
        }"#;
        fs::write(&settings_path, settings_json).unwrap();

        // Override USERPROFILE to point to our temp dir
        let orig = std::env::var("USERPROFILE").ok();
        std::env::set_var("USERPROFILE", temp_dir.to_str().unwrap());

        let result = check_hooks_installed();

        // Restore
        match orig {
            Some(v) => std::env::set_var("USERPROFILE", v),
            None => { let _ = std::env::remove_var("USERPROFILE"); }
        }

        let _ = fs::remove_dir_all(&temp_dir);
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[test]
    fn test_check_hooks_installed_without_devsprite_hooks() {
        use std::fs;
        let temp_dir = std::env::temp_dir().join("devsprite_test_hooks_no_devsprite");
        let _ = fs::create_dir_all(temp_dir.join(".claude"));
        let settings_path = temp_dir.join(".claude").join("settings.json");

        // Write settings without DevSprite hooks
        let settings_json = r#"{
            "hooks": {
                "PreToolUse": [{
                    "matcher": "*",
                    "hooks": [{
                        "type": "command",
                        "command": "powershell",
                        "args": ["-File", "C:\\other\\hook.ps1"],
                        "timeout": 5
                    }]
                }]
            }
        }"#;
        fs::write(&settings_path, settings_json).unwrap();

        let orig = std::env::var("USERPROFILE").ok();
        std::env::set_var("USERPROFILE", temp_dir.to_str().unwrap());

        let result = check_hooks_installed();

        match orig {
            Some(v) => std::env::set_var("USERPROFILE", v),
            None => { let _ = std::env::remove_var("USERPROFILE"); }
        }

        let _ = fs::remove_dir_all(&temp_dir);
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[test]
    fn test_install_hooks_script_exists() {
        let scripts_dir = find_scripts_dir();
        if let Some(dir) = scripts_dir {
            let install_script = dir.join("install-hooks.ps1");
            assert!(install_script.exists(), "install-hooks.ps1 should exist in scripts dir");
        }
    }

    #[test]
    fn test_uninstall_hooks_script_exists() {
        let scripts_dir = find_scripts_dir();
        if let Some(dir) = scripts_dir {
            let uninstall_script = dir.join("uninstall-hooks.ps1");
            assert!(uninstall_script.exists(), "uninstall-hooks.ps1 should exist in scripts dir");
        }
    }
}
