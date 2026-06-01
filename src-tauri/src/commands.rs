use tauri::command;
use tauri::AppHandle;
use tauri::Emitter;
use crate::ipc::{PermissionResponse, ResponseStore};
use crate::settings::{self, Settings};
use std::sync::Arc;
use tokio::sync::Mutex;

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

#[command]
pub fn respond_permission(
    request_id: String,
    session_id: String,
    approved: bool,
    store: tauri::State<'_, Arc<ResponseStore>>,
) -> Result<(), String> {
    let response = PermissionResponse {
        request_id: request_id.clone(),
        session_id: session_id.clone(),
        approved,
        timestamp: chrono::Utc::now().timestamp(),
    };

    store.store_response(response)
        .map_err(|e| format!("Failed to store response: {}", e))?;

    log::info!("Permission response stored: request_id={}, approved={}",
               request_id, approved);
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
}
