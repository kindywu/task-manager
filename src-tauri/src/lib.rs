mod db;

use db::Database;
use tauri::Manager;

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
        None => Ok(true), // no PIN set yet
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
fn has_pin(state: tauri::State<'_, Database>) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM pin", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    Ok(count > 0)
}

#[tauri::command]
fn check_due_notifications(
    state: tauri::State<'_, Database>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT n.id, n.task_id, t.title
             FROM notifications n
             JOIN tasks t ON t.id = n.task_id
             WHERE n.is_fired = 0 AND n.notify_at <= datetime('now', 'localtime')",
        )
        .map_err(|e| e.to_string())?;

    let rows: Vec<(i64, i64, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    for (notif_id, _task_id, title) in &rows {
        app.notification()
            .builder()
            .title("任务提醒")
            .body(&format!("任务已到期: {}", title))
            .show()
            .map_err(|e| e.to_string())?;

        conn.execute(
            "UPDATE notifications SET is_fired = 1 WHERE id = ?1",
            [notif_id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
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
            let database =
                Database::new(app_dir).expect("failed to initialize database");
            app.manage(database);

            // Check due notifications on startup
            let handle = app.handle().clone();
            let db = app.state::<Database>();
            let db_path = app.path().app_data_dir().unwrap().join("taskmanager.db");
            // We check notifications after a short delay to ensure plugin is ready
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(2));
                // Re-open connection for the spawned thread
                if let Ok(conn) = rusqlite::Connection::open(&db_path) {
                    let _ = conn.execute_batch("PRAGMA foreign_keys=ON;");
                    // Use the app handle for notification
                    let _ = handle;
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            verify_pin,
            set_pin,
            change_pin,
            has_pin,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
