mod commands;
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
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            verify_pin,
            set_pin,
            change_pin,
            has_pin,
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
