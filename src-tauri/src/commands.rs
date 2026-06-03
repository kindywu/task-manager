use crate::db::Database;
use rusqlite::types::ToSql;
use serde::Deserialize;
use tauri::State;

// ── Input types ─────────────────────────────────────────────

#[derive(Deserialize, Default)]
pub struct UpdateTaskData {
    pub title: Option<String>,
    pub description: Option<String>,
    pub notes: Option<String>,
    pub category_id: Option<i64>,
    pub priority: Option<String>,
    pub status: Option<String>,
    #[serde(default)]
    pub due_date: Option<Option<String>>,
    pub is_pinned: Option<bool>,
    pub sort_order: Option<i32>,
}

#[derive(Deserialize)]
pub struct CreateTaskData {
    pub title: String,
    pub category_id: i64,
    #[serde(default)]
    pub priority: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub due_date: Option<String>,
    #[serde(default)]
    pub sort_order: Option<i32>,
}

#[derive(Deserialize, Default)]
pub struct UpdateCategoryData {
    pub name: Option<String>,
    pub color: Option<String>,
    pub sort_order: Option<i32>,
}

// ── Helper ──────────────────────────────────────────────────

fn str_err(e: impl ToString) -> String {
    e.to_string()
}

// ── Task write commands ─────────────────────────────────────

#[tauri::command]
pub fn create_task(state: State<'_, Database>, data: CreateTaskData) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(str_err)?;
    conn.execute(
        "INSERT INTO tasks (title, category_id, priority, status, due_date, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            data.title,
            data.category_id,
            data.priority.unwrap_or_else(|| "medium".into()),
            data.status.unwrap_or_else(|| "todo".into()),
            data.due_date,
            data.sort_order.unwrap_or(0),
        ],
    )
    .map_err(str_err)?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn update_task(
    state: State<'_, Database>,
    id: i64,
    data: UpdateTaskData,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(str_err)?;

    let mut sets: Vec<String> = Vec::new();
    let mut values: Vec<Box<dyn ToSql>> = Vec::new();
    let mut idx: usize = 0;

    macro_rules! field {
        ($val:expr, $col:expr) => {
            if let Some(v) = $val {
                idx += 1;
                sets.push(format!("{} = ?{}", $col, idx));
                values.push(Box::new(v));
            }
        };
    }

    field!(data.title, "title");
    field!(data.description, "description");
    field!(data.notes, "notes");
    field!(data.category_id, "category_id");
    field!(data.priority, "priority");
    field!(data.status, "status");

    match data.due_date {
        Some(Some(v)) => {
            idx += 1;
            sets.push(format!("due_date = ?{}", idx));
            values.push(Box::new(v));
        }
        Some(None) => {
            sets.push("due_date = NULL".into());
        }
        None => {}
    }

    field!(data.is_pinned.map(|v| v as i32), "is_pinned");
    field!(data.sort_order, "sort_order");

    if sets.is_empty() {
        return Ok(());
    }

    sets.push("updated_at = datetime('now')".into());
    idx += 1;
    let sql = format!(
        "UPDATE tasks SET {} WHERE id = ?{}",
        sets.join(", "),
        idx
    );
    values.push(Box::new(id));

    let params: Vec<&dyn ToSql> = values.iter().map(|v| v.as_ref()).collect();
    conn.execute(&sql, params.as_slice()).map_err(str_err)?;
    Ok(())
}

#[tauri::command]
pub fn delete_task(state: State<'_, Database>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().map_err(str_err)?;
    conn.execute("DELETE FROM tasks WHERE id = ?1", rusqlite::params![id])
        .map_err(str_err)?;
    Ok(())
}

#[tauri::command]
pub fn move_task(
    state: State<'_, Database>,
    id: i64,
    status: String,
    sort_order: i32,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(str_err)?;
    conn.execute(
        "UPDATE tasks SET status = ?1, sort_order = ?2, updated_at = datetime('now') WHERE id = ?3",
        rusqlite::params![status, sort_order, id],
    )
    .map_err(str_err)?;
    Ok(())
}

// ── Category write commands ─────────────────────────────────

#[tauri::command]
pub fn create_category(
    state: State<'_, Database>,
    name: String,
    color: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(str_err)?;
    conn.execute(
        "INSERT INTO categories (name, color) VALUES (?1, ?2)",
        rusqlite::params![name, color],
    )
    .map_err(str_err)?;
    Ok(())
}

#[tauri::command]
pub fn update_category(
    state: State<'_, Database>,
    id: i64,
    data: UpdateCategoryData,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(str_err)?;

    let mut sets: Vec<String> = Vec::new();
    let mut values: Vec<Box<dyn ToSql>> = Vec::new();
    let mut idx: usize = 0;

    if let Some(v) = data.name {
        idx += 1;
        sets.push(format!("name = ?{}", idx));
        values.push(Box::new(v));
    }
    if let Some(v) = data.color {
        idx += 1;
        sets.push(format!("color = ?{}", idx));
        values.push(Box::new(v));
    }
    if let Some(v) = data.sort_order {
        idx += 1;
        sets.push(format!("sort_order = ?{}", idx));
        values.push(Box::new(v));
    }

    if sets.is_empty() {
        return Ok(());
    }

    idx += 1;
    let sql = format!(
        "UPDATE categories SET {} WHERE id = ?{}",
        sets.join(", "),
        idx
    );
    values.push(Box::new(id));

    let params: Vec<&dyn ToSql> = values.iter().map(|v| v.as_ref()).collect();
    conn.execute(&sql, params.as_slice()).map_err(str_err)?;
    Ok(())
}

#[tauri::command]
pub fn delete_category(state: State<'_, Database>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().map_err(str_err)?;
    conn.execute("DELETE FROM categories WHERE id = ?1", rusqlite::params![id])
        .map_err(str_err)?;
    Ok(())
}

// ── Tag write commands ──────────────────────────────────────

#[tauri::command]
pub fn create_tag(
    state: State<'_, Database>,
    name: String,
    color: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(str_err)?;
    conn.execute(
        "INSERT INTO tags (name, color) VALUES (?1, ?2)",
        rusqlite::params![name, color],
    )
    .map_err(str_err)?;
    Ok(())
}

#[tauri::command]
pub fn delete_tag(state: State<'_, Database>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().map_err(str_err)?;
    conn.execute("DELETE FROM tags WHERE id = ?1", rusqlite::params![id])
        .map_err(str_err)?;
    Ok(())
}

#[tauri::command]
pub fn set_task_tags(
    state: State<'_, Database>,
    task_id: i64,
    tag_ids: Vec<i64>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(str_err)?;
    conn.execute("DELETE FROM task_tags WHERE task_id = ?1", rusqlite::params![task_id])
        .map_err(str_err)?;
    for tag_id in tag_ids {
        conn.execute(
            "INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?1, ?2)",
            rusqlite::params![task_id, tag_id],
        )
        .map_err(str_err)?;
    }
    Ok(())
}

// ── Subtask write commands ──────────────────────────────────

#[tauri::command]
pub fn add_subtask(
    state: State<'_, Database>,
    task_id: i64,
    title: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(str_err)?;
    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM subtasks WHERE task_id = ?1",
            [task_id],
            |row| row.get(0),
        )
        .unwrap_or(-1);
    conn.execute(
        "INSERT INTO subtasks (task_id, title, sort_order) VALUES (?1, ?2, ?3)",
        rusqlite::params![task_id, title, max_order + 1],
    )
    .map_err(str_err)?;
    Ok(())
}

#[tauri::command]
pub fn toggle_subtask(
    state: State<'_, Database>,
    id: i64,
    is_completed: bool,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(str_err)?;
    conn.execute(
        "UPDATE subtasks SET is_completed = ?1 WHERE id = ?2",
        rusqlite::params![is_completed as i32, id],
    )
    .map_err(str_err)?;
    Ok(())
}

#[tauri::command]
pub fn delete_subtask(state: State<'_, Database>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().map_err(str_err)?;
    conn.execute("DELETE FROM subtasks WHERE id = ?1", rusqlite::params![id])
        .map_err(str_err)?;
    Ok(())
}
