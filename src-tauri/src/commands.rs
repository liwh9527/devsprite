use tauri::command;
use crate::ipc::{PermissionResponse, ResponseStore};
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct AppState {
    pub status: String,
    pub is_visible: bool,
    pub window_x: i32,
    pub window_y: i32,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            status: "idle".to_string(),
            is_visible: true,
            window_x: 100,
            window_y: 100,
        }
    }
}

#[command]
pub fn get_status(state: tauri::State<'_, Arc<Mutex<AppState>>>) -> String {
    let state = state.blocking_lock();
    state.status.clone()
}

#[command]
pub fn toggle_widget(state: tauri::State<'_, Arc<Mutex<AppState>>>) -> bool {
    let mut state = state.blocking_lock();
    state.is_visible = !state.is_visible;
    state.is_visible
}

#[command]
pub fn respond_permission(
    request_id: String,
    approved: bool,
    store: tauri::State<'_, Arc<ResponseStore>>,
) -> Result<(), String> {
    let response = PermissionResponse {
        request_id,
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
    (state.window_x, state.window_y)
}

#[command]
pub fn set_window_position(
    x: i32,
    y: i32,
    state: tauri::State<'_, Arc<Mutex<AppState>>>
) {
    let mut state = state.blocking_lock();
    state.window_x = x;
    state.window_y = y;
}
