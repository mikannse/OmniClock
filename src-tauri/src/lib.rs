mod timer;

use serde::Deserialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WindowEvent,
};
use timer::{TimerKind, TimerManager};

struct AppState {
    close_to_tray: Arc<AtomicBool>,
}

#[tauri::command]
fn set_close_to_tray(state: tauri::State<'_, AppState>, value: bool) {
    state.close_to_tray.store(value, Ordering::Relaxed);
}

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

#[tauri::command]
fn relaunch_app(app: AppHandle) {
    app.restart();
}

#[tauri::command]
async fn timer_start(
    timer_manager: tauri::State<'_, TimerManager>,
    id: String,
    kind: TimerKind,
) -> Result<(), String> {
    timer_manager.start(id, kind).await
}

#[tauri::command]
async fn timer_pause(
    timer_manager: tauri::State<'_, TimerManager>,
    id: String,
) -> Result<(), String> {
    timer_manager.pause(&id).await
}

#[tauri::command]
async fn timer_resume(
    timer_manager: tauri::State<'_, TimerManager>,
    id: String,
) -> Result<(), String> {
    timer_manager.resume(&id).await
}

#[tauri::command]
async fn timer_reset(
    timer_manager: tauri::State<'_, TimerManager>,
    id: String,
) -> Result<(), String> {
    timer_manager.reset(&id).await
}

#[tauri::command]
async fn timer_jump_segment(
    timer_manager: tauri::State<'_, TimerManager>,
    id: String,
    index: usize,
) -> Result<(), String> {
    timer_manager.jump_segment(&id, index).await
}

#[tauri::command]
async fn timer_skip(
    timer_manager: tauri::State<'_, TimerManager>,
    id: String,
) -> Result<(), String> {
    timer_manager.skip(&id).await
}

fn setup_tray(app: &AppHandle) -> Result<TrayIcon, tauri::Error> {
    let labels = default_tray_labels();
    let menu = create_tray_menu(app, &labels)?;

    let builder = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .tooltip(&labels.tooltip)
        .show_menu_on_left_click(false);

    let builder = if let Some(icon) = app.default_window_icon() {
        builder.icon(icon.clone())
    } else {
        builder
    };

    builder
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    if let Err(e) = window.show() {
                        eprintln!("tray show failed: {}", e);
                    }
                    if let Err(e) = window.set_focus() {
                        eprintln!("tray focus failed: {}", e);
                    }
                }
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    if let Err(e) = window.hide() {
                        eprintln!("tray hide failed: {}", e);
                    }
                }
            }
            "start_work" => {
                if let Some(window) = app.get_webview_window("main") {
                    if let Err(e) = window.show() {
                        eprintln!("tray show failed: {}", e);
                    }
                    if let Err(e) = window.set_focus() {
                        eprintln!("tray focus failed: {}", e);
                    }
                }
                if let Err(e) = app.emit("tray-start-work", ()) {
                    eprintln!("tray emit failed: {}", e);
                }
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
                    if let Err(e) = window.show() {
                        eprintln!("tray show failed: {}", e);
                    }
                    if let Err(e) = window.set_focus() {
                        eprintln!("tray focus failed: {}", e);
                    }
                }
            }
        })
        .build(app)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let result = tauri::Builder::default()
            .plugin(tauri_plugin_opener::init())
            .plugin(tauri_plugin_notification::init())
            .plugin(tauri_plugin_fs::init())
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                Some(vec!["--minimized"]),
            ))
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_dialog::init())
            .invoke_handler(tauri::generate_handler![
                update_tray_labels,
                send_notification,
                relaunch_app,
                set_close_to_tray,
                timer_start,
                timer_pause,
                timer_resume,
                timer_reset,
                timer_jump_segment,
                timer_skip,
            ])
            .setup(|app| {
                let close_to_tray = Arc::new(AtomicBool::new(false));
                let close_to_tray_for_event = close_to_tray.clone();
                app.manage(AppState { close_to_tray });

                let timer_manager = TimerManager::new(app.handle().clone());
                app.manage(timer_manager);

                #[cfg(not(mobile))]
                setup_tray(app.handle())?;

                if let Some(window) = app.get_webview_window("main") {
                    let window_clone = window.clone();
                    window.on_window_event(move |event| {
                        if let WindowEvent::CloseRequested { api, .. } = event {
                            if close_to_tray_for_event.load(Ordering::Relaxed) {
                                api.prevent_close();
                                if let Err(e) = window_clone.hide() {
                                    eprintln!("window hide failed: {}", e);
                                }
                            }
                        }
                    });

                    #[cfg(debug_assertions)]
                    {
                        window.open_devtools();
                    }
                }

                Ok(())
            })
            .run(tauri::generate_context!());

        if let Err(e) = result {
            eprintln!("error while running tauri application: {}", e);
            std::process::exit(1);
        }
    }
