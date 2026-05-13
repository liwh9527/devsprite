pub mod commands;
pub mod config;
pub mod ipc;
pub mod persistence;
pub mod tray;

use std::sync::Arc;
use tauri::Emitter;
use tauri::Manager;
use ipc::ResponseStore;
use commands::AppState;
use tokio::sync::Mutex;

pub fn run() {
    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(32);
    let response_store = Arc::new(ResponseStore::new().expect("Failed to create response store"));
    let app_state = Arc::new(Mutex::new(AppState::default()));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(response_store.clone())
        .manage(app_state.clone())
        .setup(move |app| {
            tray::create_tray(app)?;

            let pipe_name = "devsprite";
            let listener = ipc::named_pipe::NamedPipeListener::new(pipe_name);

            tauri::async_runtime::spawn(async move {
                log::info!("Starting Named Pipe listener...");
                if let Err(e) = listener.start_listening(tx).await {
                    log::error!("Named Pipe error: {}", e);
                }
            });

            let handle = app.handle().clone();
            let state_clone = app_state.clone();
            tauri::async_runtime::spawn(async move {
                while let Some(msg) = rx.recv().await {
                    if let Ok(event) = ipc::events::DevSpriteEvent::parse(&msg) {
                        if event.event == "status_change" {
                            if let Ok(status_data) = event.parse_status_change() {
                                let mut state = state_clone.lock().await;
                                state.status = status_data.status;
                            }
                        }
                        handle.emit("devsprite-event", event).ok();
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_status,
            commands::toggle_widget,
            commands::respond_permission,
            commands::get_window_position,
            commands::set_window_position
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
