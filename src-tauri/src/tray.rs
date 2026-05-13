use tauri::{
    App, Manager,
    menu::{Menu, MenuItem},
    tray::{TrayIcon, TrayIconBuilder},
    image::Image,
};

pub fn create_tray(app: &App) -> tauri::Result<()> {
    // Create menu items
    let show_hide = MenuItem::with_id(app, "show_hide", "显示/隐藏", true, None::<&str>)?;
    let status_item = MenuItem::with_id(app, "status", "状态: 空闲", false, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    // Build menu
    let menu = Menu::with_items(app, &[&show_hide, &status_item, &quit])?;

    // Load tray icon
    let icon_bytes = include_bytes!("../icons/icon.png");
    let icon = Image::from_bytes(icon_bytes)?;

    // Build tray
    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .menu_on_left_click(true)
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "show_hide" => {
                    if let Some(window) = app.get_webview_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                        } else {
                            let _ = window.show();
                        }
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .build(app)?;

    log::info!("System tray created successfully");
    Ok(())
}

pub fn update_tray_status(app: &App, status: &str) -> tauri::Result<()> {
    let status_label = match status {
        "idle" => "空闲",
        "active" => "活跃",
        "working" => "工作中",
        "waiting" => "等待中",
        "error" => "错误",
        _ => "未知",
    };

    log::info!("Tray status updated: {}", status_label);
    Ok(())
}
