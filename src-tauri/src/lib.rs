pub mod commands;
pub mod ipc;
pub mod logger;
pub mod settings;
pub mod tray;

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::Emitter;
use tauri::Manager;
use tokio::sync::oneshot;
use ipc::ResponseStore;
use commands::AppState;
use tokio::sync::Mutex as TokioMutex;

/// Stores pending permission requests waiting for user response.
///
/// Keyed by `request_id` (generated server-side). Each entry contains a oneshot
/// sender that, when fired, writes the response back through the named pipe to
/// the hook script.
pub struct PendingPermissionStore {
    pending: Mutex<HashMap<String, oneshot::Sender<String>>>,
}

impl PendingPermissionStore {
    pub fn new() -> Self {
        Self {
            pending: Mutex::new(HashMap::new()),
        }
    }

    /// Registers a pending permission request.
    pub fn insert(&self, request_id: String, sender: oneshot::Sender<String>) {
        self.pending.lock().unwrap().insert(request_id, sender);
    }

    /// Takes (removes and returns) the response sender for a given request_id.
    pub fn take(&self, request_id: &str) -> Option<oneshot::Sender<String>> {
        self.pending.lock().unwrap().remove(request_id)
    }
}

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

    let (event_tx, mut event_rx) = tokio::sync::mpsc::channel::<String>(32);
    let (pending_tx, mut pending_rx) = tokio::sync::mpsc::channel::<ipc::PendingPermission>(8);
    let response_store = Arc::new(ResponseStore::new().expect("Failed to create response store"));
    let app_state = Arc::new(TokioMutex::new(AppState { settings: app_settings }));
    let pending_store = Arc::new(PendingPermissionStore::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(response_store.clone())
        .manage(app_state.clone())
        .manage(pending_store.clone())
        .setup(move |app| {
            tray::create_tray(app)?;

            // Register global shortcut
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            let global_shortcut = app.global_shortcut();
            let _ = global_shortcut.on_shortcut(hotkey.as_str(), move |app_handle, _shortcut, event| {
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                        } else {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                }
            });

            let listener = ipc::named_pipe::NamedPipeListener::with_buffer_size(&pipe_name, buffer_size).with_max_retries(max_retries);

            tauri::async_runtime::spawn(async move {
                log::info!("Starting Named Pipe listener...");
                if let Err(e) = listener.start_listening(event_tx, pending_tx).await {
                    log::error!("Named Pipe error: {}", e);
                }
            });

            let handle = app.handle().clone();
            let pending_store_clone = pending_store.clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::select! {
                        msg = event_rx.recv() => {
                            match msg {
                                Some(msg) => {
                                    if let Ok(event) = ipc::events::DevSpriteEvent::parse(&msg) {
                                        handle.emit("devsprite-event", event).ok();
                                    }
                                }
                                None => {
                                    log::info!("Event channel closed, stopping event loop");
                                    break;
                                }
                            }
                        }
                        pending = pending_rx.recv() => {
                            match pending {
                                Some(p) => {
                                    log::debug!("Registered pending permission: {}", p.request_id);
                                    pending_store_clone.insert(p.request_id, p.response_tx);
                                }
                                None => {
                                    log::info!("Pending permission channel closed");
                                }
                            }
                        }
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
            commands::set_window_position,
            commands::check_hooks_installed,
            commands::install_hooks,
            commands::uninstall_hooks,
            commands::get_auto_launch,
            commands::set_auto_launch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
