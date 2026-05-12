pub mod commands;
pub mod config;
pub mod ipc;
pub mod tray;

use tokio::sync::mpsc;
use tauri::Emitter;

pub fn run() {
    let (tx, mut rx) = mpsc::channel::<String>(32);

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(move |app| {
            tray::create_tray(app)?;

            let pipe_name = "devsprite";
            let listener = ipc::named_pipe::NamedPipeListener::new(pipe_name);

            tokio::spawn(async move {
                if let Err(e) = listener.start_listening(tx).await {
                    eprintln!("Named Pipe error: {}", e);
                }
            });

            let handle = app.handle().clone();
            tokio::spawn(async move {
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
