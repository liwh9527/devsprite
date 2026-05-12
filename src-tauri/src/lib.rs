pub mod commands;
pub mod config;
pub mod ipc;
pub mod tray;

use tauri::Emitter;
use tauri::Manager;
use tauri::utils::config::Color;

pub fn run() {
    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(32);

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
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
            commands::get_status,
            commands::toggle_widget
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
