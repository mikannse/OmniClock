use serde::Deserialize;
use std::process::Command;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

const TRAY_ID: &str = "main-tray";

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TrayLabels {
    show: String,
    hide: String,
    start_work: String,
    quit: String,
    tooltip: String,
}

fn default_tray_labels() -> TrayLabels {
    TrayLabels {
        show: "Show window".into(),
        hide: "Hide window".into(),
        start_work: "Start focus".into(),
        quit: "Quit".into(),
        tooltip: "Omni Clock".into(),
    }
}

fn create_tray_menu(app: &AppHandle, labels: &TrayLabels) -> Result<Menu<tauri::Wry>, tauri::Error> {
    let show_item = MenuItem::with_id(app, "show", &labels.show, true, None::<&str>)?;
    let hide_item = MenuItem::with_id(app, "hide", &labels.hide, true, None::<&str>)?;
    let separator = MenuItem::with_id(app, "sep", "---", false, None::<&str>)?;
    let start_work_item = MenuItem::with_id(app, "start_work", &labels.start_work, true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", &labels.quit, true, None::<&str>)?;

    Menu::with_items(app, &[&show_item, &hide_item, &separator, &start_work_item, &quit_item])
}

#[tauri::command]
fn update_tray_labels(app: AppHandle, labels: TrayLabels) -> Result<(), String> {
    let tray = app
        .tray_by_id(TRAY_ID)
        .ok_or_else(|| "tray not found".to_string())?;
    let menu = create_tray_menu(&app, &labels).map_err(|error| error.to_string())?;

    tray.set_menu(Some(menu)).map_err(|error| error.to_string())?;
    tray.set_tooltip(Some(labels.tooltip.as_str()))
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[cfg(target_os = "macos")]
fn send_notification_impl(_app: &AppHandle, title: &str, body: &str) -> Result<(), String> {
    let script = format!(
        "display notification \"{}\" with title \"{}\"",
        body.replace("\"", "\\\""),
        title.replace("\"", "\\\"")
    );

    Command::new("osascript")
        .args(["-e", &script])
        .output()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn send_notification_impl(app: &AppHandle, title: &str, body: &str) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn send_notification(app: AppHandle, title: String, body: String) -> Result<(), String> {
    send_notification_impl(&app, &title, &body)
}

fn setup_tray(app: &AppHandle) -> Result<TrayIcon, tauri::Error> {
    let labels = default_tray_labels();
    let menu = create_tray_menu(app, &labels)?;

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip(&labels.tooltip)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            "start_work" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
                let _ = app.emit("tray-start-work", ());
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![update_tray_labels, send_notification])
        .setup(|app| {
            #[cfg(not(mobile))]
            setup_tray(app.handle())?;

            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
