mod commands;
mod db;

use db::Database;
use tauri::Emitter;
use tauri::Manager;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};

#[tauri::command]
fn verify_pin(state: tauri::State<'_, Database>, pin: String) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let result: Option<String> = conn
        .query_row(
            "SELECT pin_hash FROM pin ORDER BY id DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .ok()
        .flatten();

    match result {
        Some(hash) => Ok(bcrypt::verify(&pin, &hash).unwrap_or(false)),
        None => Ok(true),
    }
}

#[tauri::command]
fn set_pin(state: tauri::State<'_, Database>, pin: String) -> Result<(), String> {
    let hash = bcrypt::hash(&pin, 4).map_err(|e| e.to_string())?;
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM pin", []).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO pin (pin_hash) VALUES (?1)", [&hash])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn change_pin(
    state: tauri::State<'_, Database>,
    old_pin: String,
    new_pin: String,
) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let result: Option<String> = conn
        .query_row(
            "SELECT pin_hash FROM pin ORDER BY id DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .ok()
        .flatten();

    match result {
        Some(hash) => {
            if bcrypt::verify(&old_pin, &hash).unwrap_or(false) {
                let new_hash = bcrypt::hash(&new_pin, 4).map_err(|e| e.to_string())?;
                conn.execute("DELETE FROM pin", []).map_err(|e| e.to_string())?;
                conn.execute("INSERT INTO pin (pin_hash) VALUES (?1)", [&new_hash])
                    .map_err(|e| e.to_string())?;
                Ok(true)
            } else {
                Ok(false)
            }
        }
        None => Ok(false),
    }
}

#[tauri::command]
fn exit_app(app: tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.close();
    }
    // The tray keeps the process alive, so we must force-exit.
    // Delay gives WebView2 time to release window handles before process dies.
    let handle = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(2));
        handle.exit(0);
    });
}

#[tauri::command]
fn has_pin(state: tauri::State<'_, Database>) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM pin", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    Ok(count > 0)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            let database = Database::new(app_dir).expect("failed to initialize database");
            app.manage(database);

            let show_i = MenuItemBuilder::with_id("show", "Show Window").build(app)?;
            let quit_i = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app)
                .item(&show_i)
                .item(&quit_i)
                .build()?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                        "quit" => {
                            let _ = app.emit("tray-quit", ());
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            verify_pin,
            set_pin,
            change_pin,
            has_pin,
            exit_app,
            commands::create_task,
            commands::update_task,
            commands::delete_task,
            commands::move_task,
            commands::create_category,
            commands::update_category,
            commands::delete_category,
            commands::create_tag,
            commands::delete_tag,
            commands::set_task_tags,
            commands::add_subtask,
            commands::toggle_subtask,
            commands::delete_subtask,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
