use tauri::{
    App, Manager,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    image::Image,
};

/// Wrapper to store the status menu item in managed state for later updates.
pub(crate) struct TrayStatusMenuItem(pub MenuItem<tauri::Wry>);

pub fn create_tray(app: &App) -> tauri::Result<()> {
    // Create menu items
    let show_hide = MenuItem::with_id(app, "show_hide", "显示/隐藏", true, None::<&str>)?;
    let status_item = MenuItem::with_id(app, "status", "状态: 空闲", false, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    // Store status_item in managed state for later updates
    app.manage(TrayStatusMenuItem(status_item.clone()));

    // Build menu
    let menu = Menu::with_items(app, &[&show_hide, &status_item, &quit])?;

    // Load tray icon
    let icon_bytes = include_bytes!("../icons/icon.png");
    let icon = image::load_from_memory(icon_bytes)
        .expect("Failed to load icon")
        .to_rgba8();
    let (w, h) = icon.dimensions();
    let icon = Image::new_owned(icon.into_raw(), w, h);

    // Build tray
    let _tray = TrayIconBuilder::with_id("main")
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(true)
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

fn get_status_label(status: &str) -> &str {
    match status {
        "idle" => "空闲",
        "active" => "活跃",
        "working" => "工作中",
        "waiting" => "等待中",
        "error" => "错误",
        _ => "未知",
    }
}

pub fn update_tray_status(app: &App, status: &str) -> tauri::Result<()> {
    let status_label = get_status_label(status);
    let state = app.state::<TrayStatusMenuItem>();
    let _ = state.0.set_text(format!("状态: {}", status_label));
    log::info!("Tray status updated: {}", status_label);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_status_label_mapping() {
        assert_eq!(get_status_label("idle"), "空闲");
        assert_eq!(get_status_label("active"), "活跃");
        assert_eq!(get_status_label("working"), "工作中");
        assert_eq!(get_status_label("waiting"), "等待中");
        assert_eq!(get_status_label("error"), "错误");
        assert_eq!(get_status_label("unknown"), "未知");
    }
}
