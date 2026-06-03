use rusqlite::{Connection, Result as SqliteResult};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(app_dir: PathBuf) -> SqliteResult<Self> {
        fs::create_dir_all(&app_dir).ok();
        let db_path = app_dir.join("taskmanager.db");
        let conn = Connection::open(db_path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        let db = Database {
            conn: Mutex::new(conn),
        };
        db.init_tables()?;
        db.seed_categories()?;
        Ok(db)
    }

    fn init_tables(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS pin (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                pin_hash   TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS categories (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                name       TEXT NOT NULL,
                color      TEXT NOT NULL DEFAULT '#fa8c16',
                sort_order INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS tags (
                id    INTEGER PRIMARY KEY AUTOINCREMENT,
                name  TEXT NOT NULL UNIQUE,
                color TEXT NOT NULL DEFAULT '#fa8c16'
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                title       TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                notes       TEXT NOT NULL DEFAULT '',
                category_id INTEGER NOT NULL REFERENCES categories(id),
                priority    TEXT NOT NULL DEFAULT 'medium'
                            CHECK(priority IN ('high','medium','low')),
                status      TEXT NOT NULL DEFAULT 'todo'
                            CHECK(status IN ('todo','in_progress','done')),
                due_date    TEXT,
                is_pinned   INTEGER NOT NULL DEFAULT 0,
                sort_order  INTEGER NOT NULL DEFAULT 0,
                created_at  TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS subtasks (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id      INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                title        TEXT NOT NULL,
                is_completed INTEGER NOT NULL DEFAULT 0,
                sort_order   INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS task_tags (
                task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
                PRIMARY KEY (task_id, tag_id)
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id   INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                notify_at TEXT NOT NULL,
                is_fired  INTEGER NOT NULL DEFAULT 0
            );
            ",
        )
    }

    fn seed_categories(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        let count: i64 =
            conn.query_row("SELECT COUNT(*) FROM categories", [], |row| row.get(0))?;
        if count == 0 {
            conn.execute(
                "INSERT INTO categories (name, color, sort_order) VALUES
                ('工作', '#f5222d', 0),
                ('个人', '#fa8c16', 1),
                ('学习', '#1890ff', 2)",
                [],
            )?;
        }
        Ok(())
    }
}
