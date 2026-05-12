use tauri::command;

#[command]
pub fn get_status() -> String {
    "idle".to_string()
}

#[command]
pub fn toggle_widget() -> bool {
    true
}
