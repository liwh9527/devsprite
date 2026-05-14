pub mod commands;
pub mod ipc;
pub mod logger;
pub mod settings;
pub mod tray;

use std::sync::Arc;
use tauri::Emitter;
use ipc::ResponseStore;
use commands::AppState;
use tokio::sync::Mutex;

pub fn run() {
    // Initialize logging (console + file)
    logger::init();

    // Migrate legacy config.json if it exists
    settings::migrate_legacy_config();

    // Load settings from disk (or use defaults)
    let app_settings = settings::load_settings();
    let pipe_name = app_settings.pipe.name.clone();
    let buffer_size = app_settings.pipe.buffer_size;
    let max_retries = app_settings.pipe.max_retries;
    let hotkey = app_settings.behavior.hotkey.clone();

    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(32);
    let response_store = Arc::new(ResponseStore::new().expect("Failed to create response store"));
    let app_state = Arc::new(Mutex::new(AppState { settings: app_settings }));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(response_store.clone())
        .manage(app_state.clone())
        .setup(move |app| {
            tray::create_tray(app)?;

            // Register global shortcut
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            if let Ok(global_shortcut) = app.global_shortcut() {
                let _ = global_shortcut.on_shortcut(&hotkey, move |app_handle, shortcut, event| {
                    if event == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        if let Some(window) = app_handle.get_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                });
            }

            let listener = ipc::named_pipe::NamedPipeListener::with_buffer_size(&pipe_name, buffer_size).with_max_retries(max_retries);

            tauri::async_runtime::spawn(async move {
                log::info!("Starting Named Pipe listener...");
                if let Err(e) = listener.start_listening(tx).await {
                    log::error!("Named Pipe error: {}", e);
                }
            });

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                while let Some(msg) = rx.recv().await {
                    if let Ok(event) = ipc::events::DevSpriteEvent::parse(&msg) {
                        handle.emit("devsprite-event", event).ok();
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::update_settings,
            commands::get_status,
            commands::toggle_widget,
            commands::respond_permission,
            commands::get_window_position,
            commands::set_window_position
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
