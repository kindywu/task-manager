# Task Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local desktop task manager with Tauri v2 + React + Ant Design + SQLite.

**Architecture:** Tauri v2 desktop app with React/TypeScript frontend and Rust backend. SQLite database managed via `tauri-plugin-sql`. Kanban board UI with @dnd-kit drag-and-drop. Zustand for frontend state, react-router for routing, react-i18next for i18n.

**Tech Stack:** Tauri v2, React 18, TypeScript, Ant Design 5, Zustand, @dnd-kit, recharts, react-i18next, SQLite (tauri-plugin-sql), tauri-plugin-notification

---

### Task 1: Scaffold Tauri v2 project

**Files:**
- Create: entire project scaffold via `npm create tauri-app`

- [ ] **Step 1: Create project with Tauri CLI**

```bash
cd C:/ws/Rust/tauri
npm create tauri-app@latest . -- --template react-ts --manager npm
```

Choose: React + TypeScript + Vite template.

- [ ] **Step 2: Verify scaffold**

```bash
ls src/ src-tauri/ package.json vite.config.ts tsconfig.json
```

Expected: all directories and files exist.

- [ ] **Step 3: Install npm dependencies**

```bash
cd C:/ws/Rust/tauri && npm install
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "scaffold: create Tauri v2 + React + TS project"
```

---

### Task 2: Install frontend dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install all required packages**

```bash
cd C:/ws/Rust/tauri && npm install antd@5 @ant-design/icons react-router-dom zustand react-i18next i18next @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities recharts dayjs @tauri-apps/plugin-sql @tauri-apps/plugin-notification
```

- [ ] **Step 2: Install dev dependencies**

```bash
cd C:/ws/Rust/tauri && npm install -D @types/react @types/react-dom
```

- [ ] **Step 3: Verify install**

```bash
node -e "require('antd'); require('react-router-dom'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json && git commit -m "chore: install frontend dependencies"
```

---

### Task 3: Add Tauri Rust dependencies

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Update Cargo.toml for SQLite and notification plugins**

Read the generated `Cargo.toml`, then edit it to add these under `[dependencies]`:

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-notification = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
bcrypt = "0.16"
rusqlite = { version = "0.32", features = ["bundled"] }
```

- [ ] **Step 2: Update tauri.conf.json for plugin permissions**

Read existing `tauri.conf.json`, then add under `plugins`:

```json
{
  "plugins": {
    "sql": {
      "preload": {
        "db": "sqlite:taskmanager.db"
      }
    },
    "notification": {
      "all": true
    }
  }
}
```

- [ ] **Step 3: Add plugin capabilities**

Create or modify `src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "sql:default",
    "sql:allow-load",
    "sql:allow-execute",
    "sql:allow-select",
    "notification:default",
    "notification:allow-notify",
    "notification:allow-is-permission-granted",
    "notification:allow-request-permission"
  ]
}
```

- [ ] **Step 4: Update tauri.conf.json window config**

Edit `src-tauri/tauri.conf.json` to set window title and size:

```json
{
  "app": {
    "windows": [
      {
        "title": "Task Manager",
        "width": 1200,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false
      }
    ]
  }
}
```

- [ ] **Step 5: Build to verify Rust deps resolve**

```bash
cd C:/ws/Rust/tauri && cargo build --manifest-path src-tauri/Cargo.toml 2>&1 | tail -5
```

Expected: successful build (or just dependency resolution succeeds).

- [ ] **Step 6: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/tauri.conf.json src-tauri/capabilities/ && git commit -m "chore: add Rust dependencies for SQLite and notifications"
```

---

### Task 4: Define TypeScript types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write types file**

```typescript
export interface Category {
  id: number;
  name: string;
  color: string;
  sort_order: number;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  is_completed: boolean;
  sort_order: number;
}

export type Priority = 'high' | 'medium' | 'low';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: number;
  title: string;
  description: string;
  notes: string;
  category_id: number;
  priority: Priority;
  status: TaskStatus;
  due_date: string | null;
  is_pinned: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TaskWithRelations extends Task {
  category_name: string;
  category_color: string;
  tags: Tag[];
  subtasks: Subtask[];
  subtask_progress: { done: number; total: number };
}

export interface KanbanColumn {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface Notification {
  id: number;
  task_id: number;
  notify_at: string;
  is_fired: boolean;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts && git commit -m "feat: add TypeScript type definitions"
```

---

### Task 5: Set up i18n

**Files:**
- Create: `src/i18n/index.ts`
- Create: `src/i18n/zh-CN.json`
- Create: `src/i18n/en.json`

- [ ] **Step 1: Write i18n config**

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './zh-CN.json';
import en from './en.json';

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    en: { translation: en },
  },
  lng: localStorage.getItem('language') || 'zh-CN',
  fallbackLng: 'zh-CN',
  interpolation: { escapeValue: false },
});

export default i18n;
```

- [ ] **Step 2: Write zh-CN translations**

```json
{
  "app": {
    "title": "任务管理器",
    "kanban": "看板",
    "statistics": "统计",
    "settings": "设置"
  },
  "unlock": {
    "setPin": "设置解锁密码",
    "enterPin": "输入密码解锁",
    "confirmPin": "确认密码",
    "pinMismatch": "两次输入的密码不一致",
    "pinTooShort": "密码至少需要4位",
    "wrongPin": "密码错误，请重试",
    "unlock": "解锁"
  },
  "kanban": {
    "todo": "待办",
    "inProgress": "进行中",
    "done": "已完成",
    "addTask": "添加任务",
    "search": "搜索任务...",
    "filter": "筛选"
  },
  "task": {
    "title": "标题",
    "description": "描述",
    "notes": "备注",
    "category": "分类",
    "priority": "优先级",
    "high": "高",
    "medium": "中",
    "low": "低",
    "dueDate": "截止日期",
    "tags": "标签",
    "subtasks": "子任务",
    "addSubtask": "添加子任务",
    "noDueDate": "无截止日期",
    "overdue": "已过期",
    "delete": "删除任务",
    "deleteConfirm": "确定要删除这个任务吗？",
    "save": "保存",
    "cancel": "取消",
    "created": "创建于",
    "updated": "更新于"
  },
  "category": {
    "manage": "管理分类",
    "add": "添加分类",
    "name": "分类名称",
    "color": "颜色",
    "delete": "删除分类"
  },
  "tag": {
    "manage": "管理标签",
    "add": "添加标签",
    "name": "标签名称"
  },
  "statistics": {
    "completionRate": "完成率",
    "trend": "趋势",
    "categoryDistribution": "分类分布",
    "priorityBreakdown": "优先级分布",
    "thisWeek": "本周",
    "thisMonth": "本月",
    "last7Days": "近7天",
    "last30Days": "近30天",
    "tasksCreated": "新建任务",
    "tasksCompleted": "完成任务",
    "total": "总计",
    "completed": "已完成",
    "pending": "未完成"
  },
  "settings": {
    "changePin": "修改密码",
    "oldPin": "旧密码",
    "newPin": "新密码",
    "confirmNewPin": "确认新密码",
    "language": "语言",
    "theme": "主题",
    "light": "浅色",
    "dark": "深色",
    "system": "跟随系统",
    "pinChanged": "密码修改成功",
    "pinNotMatch": "新密码两次输入不一致",
    "wrongOldPin": "旧密码错误"
  },
  "common": {
    "save": "保存",
    "cancel": "取消",
    "delete": "删除",
    "edit": "编辑",
    "confirm": "确定",
    "close": "关闭",
    "back": "返回",
    "noData": "暂无数据"
  }
}
```

- [ ] **Step 3: Write en translations**

```json
{
  "app": {
    "title": "Task Manager",
    "kanban": "Kanban",
    "statistics": "Statistics",
    "settings": "Settings"
  },
  "unlock": {
    "setPin": "Set Unlock PIN",
    "enterPin": "Enter PIN to Unlock",
    "confirmPin": "Confirm PIN",
    "pinMismatch": "PINs do not match",
    "pinTooShort": "PIN must be at least 4 digits",
    "wrongPin": "Wrong PIN, please retry",
    "unlock": "Unlock"
  },
  "kanban": {
    "todo": "To Do",
    "inProgress": "In Progress",
    "done": "Done",
    "addTask": "Add Task",
    "search": "Search tasks...",
    "filter": "Filter"
  },
  "task": {
    "title": "Title",
    "description": "Description",
    "notes": "Notes",
    "category": "Category",
    "priority": "Priority",
    "high": "High",
    "medium": "Medium",
    "low": "Low",
    "dueDate": "Due Date",
    "tags": "Tags",
    "subtasks": "Subtasks",
    "addSubtask": "Add Subtask",
    "noDueDate": "No Due Date",
    "overdue": "Overdue",
    "delete": "Delete Task",
    "deleteConfirm": "Are you sure you want to delete this task?",
    "save": "Save",
    "cancel": "Cancel",
    "created": "Created",
    "updated": "Updated"
  },
  "category": {
    "manage": "Manage Categories",
    "add": "Add Category",
    "name": "Category Name",
    "color": "Color",
    "delete": "Delete Category"
  },
  "tag": {
    "manage": "Manage Tags",
    "add": "Add Tag",
    "name": "Tag Name"
  },
  "statistics": {
    "completionRate": "Completion Rate",
    "trend": "Trend",
    "categoryDistribution": "Category Distribution",
    "priorityBreakdown": "Priority Breakdown",
    "thisWeek": "This Week",
    "thisMonth": "This Month",
    "last7Days": "Last 7 Days",
    "last30Days": "Last 30 Days",
    "tasksCreated": "Tasks Created",
    "tasksCompleted": "Tasks Completed",
    "total": "Total",
    "completed": "Completed",
    "pending": "Pending"
  },
  "settings": {
    "changePin": "Change PIN",
    "oldPin": "Old PIN",
    "newPin": "New PIN",
    "confirmNewPin": "Confirm New PIN",
    "language": "Language",
    "theme": "Theme",
    "light": "Light",
    "dark": "Dark",
    "system": "System",
    "pinChanged": "PIN changed successfully",
    "pinNotMatch": "New PINs do not match",
    "wrongOldPin": "Old PIN is incorrect"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "confirm": "Confirm",
    "close": "Close",
    "back": "Back",
    "noData": "No Data"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/i18n/ && git commit -m "feat: add i18n with zh-CN and en translations"
```

---

### Task 6: Set up SQLite database init (Rust side)

**Files:**
- Create: `src-tauri/src/db.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write db.rs with table initialization**

```rust
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
```

- [ ] **Step 2: Update lib.rs to initialize database**

Read the existing `src-tauri/src/lib.rs`, then replace it with:

```rust
mod db;

use db::Database;
use tauri::Manager;

#[tauri::command]
fn verify_pin(db: tauri::State<Database>, pin: String) -> Result<bool, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let result: Option<String> = conn
        .query_row("SELECT pin_hash FROM pin ORDER BY id DESC LIMIT 1", [], |row| {
            row.get(0)
        })
        .optional()
        .map_err(|e| e.to_string())?;

    match result {
        Some(hash) => Ok(bcrypt::verify(&pin, &hash).unwrap_or(false)),
        None => Ok(true), // no PIN set yet, any PIN is accepted during setup
    }
}

#[tauri::command]
fn set_pin(db: tauri::State<Database>, pin: String) -> Result<(), String> {
    let hash = bcrypt::hash(&pin, 4).map_err(|e| e.to_string())?;
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM pin", []).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO pin (pin_hash) VALUES (?1)", [&hash])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn change_pin(db: tauri::State<Database>, old_pin: String, new_pin: String) -> Result<bool, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let result: Option<String> = conn
        .query_row("SELECT pin_hash FROM pin ORDER BY id DESC LIMIT 1", [], |row| {
            row.get(0)
        })
        .optional()
        .map_err(|e| e.to_string())?;

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
fn has_pin(db: tauri::State<Database>) -> Result<bool, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM pin", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    Ok(count > 0)
}

#[tauri::command]
fn check_due_notifications(db: tauri::State<Database>, app: tauri::AppHandle) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT n.id, n.task_id, n.notify_at, t.title
             FROM notifications n
             JOIN tasks t ON t.id = n.task_id
             WHERE n.is_fired = 0 AND n.notify_at <= datetime('now', 'localtime')",
        )
        .map_err(|e| e.to_string())?;

    let rows: Vec<(i64, i64, String, String)> = stmt
        .query_map([], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    for (notif_id, _task_id, _notify_at, title) in &rows {
        use tauri_plugin_notification::NotificationExt;
        app.notification()
            .builder()
            .title("任务提醒")
            .body(&format!("任务已到期: {}", title))
            .show()
            .map_err(|e| e.to_string())?;

        conn.execute("UPDATE notifications SET is_fired = 1 WHERE id = ?1", [notif_id])
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
            let database = Database::new(app_dir).expect("failed to init database");
            app.manage(database);

            let handle = app.handle().clone();
            let db_state = app.state::<Database>();
            check_due_notifications(db_state.inner().clone(), handle).ok();

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            verify_pin,
            set_pin,
            change_pin,
            has_pin,
            check_due_notifications,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: Update main.rs for Tauri v2**

Read existing `src-tauri/src/main.rs`, replace with:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    task_manager_lib::run()
}
```

Note: lib.rs is the library crate. Check `Cargo.toml` for the lib name; if it's `tauri_app`, adjust.

- [ ] **Step 4: Verify Rust compilation**

```bash
cd C:/ws/Rust/tauri && cargo build --manifest-path src-tauri/Cargo.toml 2>&1 | tail -10
```

Expected: successful compilation.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/ && git commit -m "feat: add Rust-side database init and PIN commands"
```

---

### Task 7: Set up frontend database helpers and Zustand stores

**Files:**
- Create: `src/db/database.ts`
- Create: `src/stores/useAuthStore.ts`
- Create: `src/stores/useTaskStore.ts`
- Create: `src/stores/useSettingsStore.ts`

- [ ] **Step 1: Write database helper**

```typescript
import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:taskmanager.db');
  }
  return db;
}

export async function initDb(): Promise<void> {
  const database = await getDb();
  await database.execute(`
    CREATE TABLE IF NOT EXISTS pin (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      pin_hash   TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      color      TEXT NOT NULL DEFAULT '#fa8c16',
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS tags (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#fa8c16'
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      notes       TEXT NOT NULL DEFAULT '',
      category_id INTEGER NOT NULL REFERENCES categories(id),
      priority    TEXT NOT NULL DEFAULT 'medium',
      status      TEXT NOT NULL DEFAULT 'todo',
      due_date    TEXT,
      is_pinned   INTEGER NOT NULL DEFAULT 0,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id      INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      sort_order   INTEGER NOT NULL DEFAULT 0
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS task_tags (
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, tag_id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id   INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      notify_at TEXT NOT NULL,
      is_fired  INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Seed default categories if empty
  const cats = await database.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM categories'
  );
  if (cats[0].count === 0) {
    await database.execute(
      `INSERT INTO categories (name, color, sort_order) VALUES
       ('工作', '#f5222d', 0),
       ('个人', '#fa8c16', 1),
       ('学习', '#1890ff', 2)`
    );
  }
}
```

- [ ] **Step 2: Write auth store**

```typescript
import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface AuthState {
  isLocked: boolean;
  isFirstRun: boolean;
  unlock: (pin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
  checkPinStatus: () => Promise<void>;
  lock: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLocked: true,
  isFirstRun: false,

  checkPinStatus: async () => {
    const has = await invoke<boolean>('has_pin');
    set({ isFirstRun: !has, isLocked: true });
  },

  unlock: async (pin: string) => {
    const ok = await invoke<boolean>('verify_pin', { pin });
    if (ok) {
      set({ isLocked: false, isFirstRun: false });
    }
    return ok;
  },

  setPin: async (pin: string) => {
    await invoke('set_pin', { pin });
    set({ isLocked: false, isFirstRun: false });
  },

  changePin: async (oldPin: string, newPin: string) => {
    const ok = await invoke<boolean>('change_pin', { oldPin, newPin });
    return ok;
  },

  lock: () => set({ isLocked: true }),
}));
```

- [ ] **Step 3: Write task store**

```typescript
import { create } from 'zustand';
import { getDb } from '../db/database';
import type { TaskWithRelations, Task, Category, Tag, Subtask, Priority, TaskStatus } from '../types';

interface TaskState {
  tasks: TaskWithRelations[];
  categories: Category[];
  tags: Tag[];
  loading: boolean;
  searchQuery: string;
  filterCategory: number | null;
  filterPriority: Priority | null;

  loadTasks: () => Promise<void>;
  loadCategories: () => Promise<void>;
  loadTags: () => Promise<void>;
  createTask: (data: {
    title: string;
    category_id: number;
    priority?: Priority;
    status?: TaskStatus;
    due_date?: string | null;
    sort_order?: number;
  }) => Promise<number>;
  updateTask: (id: number, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  moveTask: (id: number, status: TaskStatus, sortOrder: number) => Promise<void>;

  // Categories
  createCategory: (name: string, color: string) => Promise<void>;
  updateCategory: (id: number, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;

  // Tags
  createTag: (name: string, color: string) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;
  setTaskTags: (taskId: number, tagIds: number[]) => Promise<void>;

  // Subtasks
  addSubtask: (taskId: number, title: string) => Promise<void>;
  toggleSubtask: (id: number, isCompleted: boolean) => Promise<void>;
  deleteSubtask: (id: number) => Promise<void>;

  // Filters
  setSearchQuery: (q: string) => void;
  setFilterCategory: (id: number | null) => void;
  setFilterPriority: (p: Priority | null) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  categories: [],
  tags: [],
  loading: false,
  searchQuery: '',
  filterCategory: null,
  filterPriority: null,

  loadTasks: async () => {
    const db = await getDb();
    set({ loading: true });
    const tasks = await db.select<Task[]>(
      'SELECT * FROM tasks ORDER BY sort_order ASC'
    );
    const enriched: TaskWithRelations[] = [];
    for (const t of tasks) {
      const cat = await db.select<Category[]>(
        'SELECT * FROM categories WHERE id = $1', [t.category_id]
      );
      const tagRows = await db.select<{ tag_id: number }[]>(
        'SELECT tag_id FROM task_tags WHERE task_id = $1', [t.id]
      );
      let tags: Tag[] = [];
      if (tagRows.length > 0) {
        const ids = tagRows.map((r) => r.tag_id);
        const placeholders = ids.map((_, i) => '$' + (i + 1)).join(',');
        tags = await db.select<Tag[]>(
          `SELECT * FROM tags WHERE id IN (${placeholders})`, ids
        );
      }
      const subtasks = await db.select<Subtask[]>(
        'SELECT * FROM subtasks WHERE task_id = $1 ORDER BY sort_order ASC', [t.id]
      );
      enriched.push({
        ...t,
        is_pinned: !!t.is_pinned,
        category_name: cat[0]?.name || '',
        category_color: cat[0]?.color || '#fa8c16',
        tags,
        subtasks: subtasks.map((s) => ({ ...s, is_completed: !!s.is_completed })),
        subtask_progress: {
          done: subtasks.filter((s) => s.is_completed).length,
          total: subtasks.length,
        },
      });
    }
    set({ tasks: enriched, loading: false });
  },

  loadCategories: async () => {
    const db = await getDb();
    const cats = await db.select<Category[]>(
      'SELECT * FROM categories ORDER BY sort_order ASC'
    );
    set({ categories: cats });
  },

  loadTags: async () => {
    const db = await getDb();
    const tags = await db.select<Tag[]>('SELECT * FROM tags ORDER BY name ASC');
    set({ tags });
  },

  createTask: async (data) => {
    const db = await getDb();
    const result = await db.execute(
      `INSERT INTO tasks (title, category_id, priority, status, due_date, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        data.title,
        data.category_id,
        data.priority || 'medium',
        data.status || 'todo',
        data.due_date || null,
        data.sort_order || 0,
      ]
    );
    await get().loadTasks();
    return result.lastInsertId as number;
  },

  updateTask: async (id, data) => {
    const db = await getDb();
    const keys = Object.keys(data).filter((k) => data[k as keyof Task] !== undefined);
    if (keys.length === 0) return;
    const sets = keys.map((k, i) => {
      if (k === 'is_pinned') return `is_pinned = $${i + 1}`;
      return `${k} = $${i + 1}`;
    });
    const values = keys.map((k) => {
      const v = data[k as keyof Task];
      if (k === 'is_pinned') return v ? 1 : 0;
      return v;
    });
    await db.execute(
      `UPDATE tasks SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = $${keys.length + 1}`,
      [...values, id]
    );
    await get().loadTasks();
  },

  deleteTask: async (id) => {
    const db = await getDb();
    await db.execute('DELETE FROM tasks WHERE id = $1', [id]);
    await get().loadTasks();
  },

  moveTask: async (id, status, sortOrder) => {
    const db = await getDb();
    await db.execute(
      'UPDATE tasks SET status = $1, sort_order = $2, updated_at = datetime(\'now\') WHERE id = $3',
      [status, sortOrder, id]
    );
    await get().loadTasks();
  },

  createCategory: async (name, color) => {
    const db = await getDb();
    await db.execute(
      'INSERT INTO categories (name, color) VALUES ($1, $2)',
      [name, color]
    );
    await get().loadCategories();
  },

  updateCategory: async (id, data) => {
    const db = await getDb();
    const keys = Object.keys(data).filter((k) => data[k as keyof Category] !== undefined);
    if (keys.length === 0) return;
    const sets = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = keys.map((k) => data[k as keyof Category]);
    await db.execute(
      `UPDATE categories SET ${sets.join(', ')} WHERE id = $${keys.length + 1}`,
      [...values, id]
    );
    await get().loadCategories();
  },

  deleteCategory: async (id) => {
    const db = await getDb();
    await db.execute('DELETE FROM categories WHERE id = $1', [id]);
    await get().loadCategories();
  },

  createTag: async (name, color) => {
    const db = await getDb();
    await db.execute(
      'INSERT INTO tags (name, color) VALUES ($1, $2)',
      [name, color]
    );
    await get().loadTags();
  },

  deleteTag: async (id) => {
    const db = await getDb();
    await db.execute('DELETE FROM tags WHERE id = $1', [id]);
    await get().loadTags();
  },

  setTaskTags: async (taskId, tagIds) => {
    const db = await getDb();
    await db.execute('DELETE FROM task_tags WHERE task_id = $1', [taskId]);
    for (const tagId of tagIds) {
      await db.execute(
        'INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES ($1, $2)',
        [taskId, tagId]
      );
    }
    await get().loadTasks();
  },

  addSubtask: async (taskId, title) => {
    const db = await getDb();
    const maxOrder = await db.select<{ m: number }[]>(
      'SELECT COALESCE(MAX(sort_order), -1) as m FROM subtasks WHERE task_id = $1',
      [taskId]
    );
    await db.execute(
      'INSERT INTO subtasks (task_id, title, sort_order) VALUES ($1, $2, $3)',
      [taskId, title, (maxOrder[0]?.m || 0) + 1]
    );
    await get().loadTasks();
  },

  toggleSubtask: async (id, isCompleted) => {
    const db = await getDb();
    await db.execute(
      'UPDATE subtasks SET is_completed = $1 WHERE id = $2',
      [isCompleted ? 1 : 0, id]
    );
    await get().loadTasks();
  },

  deleteSubtask: async (id) => {
    const db = await getDb();
    await db.execute('DELETE FROM subtasks WHERE id = $1', [id]);
    await get().loadTasks();
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setFilterCategory: (id) => set({ filterCategory: id }),
  setFilterPriority: (p) => set({ filterPriority: p }),
}));
```

- [ ] **Step 4: Write settings store**

```typescript
import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface SettingsState {
  theme: Theme;
  language: string;
  setTheme: (t: Theme) => void;
  setLanguage: (l: string) => void;
  initSettings: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: (localStorage.getItem('theme') as Theme) || 'light',
  language: localStorage.getItem('language') || 'zh-CN',

  setTheme: (t) => {
    localStorage.setItem('theme', t);
    set({ theme: t });
    applyTheme(t);
  },

  setLanguage: (l) => {
    localStorage.setItem('language', l);
    set({ language: l });
  },

  initSettings: () => {
    const t = (localStorage.getItem('theme') as Theme) || 'light';
    applyTheme(t);
  },
}));

function applyTheme(theme: Theme) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}
```

- [ ] **Step 5: Commit**

```bash
git add src/db/ src/stores/ && git commit -m "feat: add database helpers and Zustand stores"
```

---

### Task 8: Build PIN unlock page

**Files:**
- Create: `src/components/PinInput.tsx`
- Create: `src/routes/UnlockPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write PinInput component**

```tsx
import { useState } from 'react';
import { Input, Button, Space, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface PinInputProps {
  onSubmit: (pin: string) => void;
  confirmMode?: boolean;
  error?: string;
  loading?: boolean;
  title: string;
}

export default function PinInput({ onSubmit, confirmMode, error, loading, title }: PinInputProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleSubmit = () => {
    if (pin.length < 4) return;
    if (confirmMode) {
      if (pin !== confirmPin) return;
      onSubmit(pin);
    } else {
      onSubmit(pin);
    }
  };

  return (
    <div style={{ textAlign: 'center', maxWidth: 320, margin: '0 auto' }}>
      <LockOutlined style={{ fontSize: 48, color: '#fa8c16', marginBottom: 16 }} />
      <Title level={3}>{title}</Title>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Input.Password
          size="large"
          placeholder="输入4-6位PIN码"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
          onPressEnter={handleSubmit}
          style={{ textAlign: 'center', letterSpacing: 8 }}
        />
        {confirmMode && (
          <Input.Password
            size="large"
            placeholder="确认PIN码"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            onPressEnter={handleSubmit}
            style={{ textAlign: 'center', letterSpacing: 8 }}
          />
        )}
        {error && <Text type="danger">{error}</Text>}
        <Button
          type="primary"
          block
          size="large"
          onClick={handleSubmit}
          loading={loading}
          disabled={pin.length < 4 || (confirmMode && pin !== confirmPin)}
        >
          确定
        </Button>
      </Space>
    </div>
  );
}
```

- [ ] **Step 2: Write UnlockPage**

```tsx
import { useState, useEffect } from 'react';
import { App } from 'antd';
import { useAuthStore } from '../stores/useAuthStore';
import PinInput from '../components/PinInput';

export default function UnlockPage() {
  const { isFirstRun, unlock, setPin, checkPinStatus } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    checkPinStatus().then(() => setReady(true));
  }, [checkPinStatus]);

  const handleUnlock = async (pin: string) => {
    setLoading(true);
    setError('');
    const ok = await unlock(pin);
    if (!ok) {
      setError('密码错误，请重试');
    }
    setLoading(false);
  };

  const handleSetPin = async (pin: string) => {
    setLoading(true);
    await setPin(pin);
    setLoading(false);
  };

  if (!ready) return null;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #fff7e6 0%, #fff1cc 100%)',
    }}>
      <div style={{
        background: '#fff',
        padding: 48,
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(250, 140, 22, 0.12)',
        width: 400,
      }}>
        {isFirstRun ? (
          <PinInput
            onSubmit={handleSetPin}
            confirmMode
            title="设置解锁密码"
            loading={loading}
          />
        ) : (
          <PinInput
            onSubmit={handleUnlock}
            title="输入密码解锁"
            error={error}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update App.tsx**

```tsx
import { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp, theme, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { useAuthStore } from './stores/useAuthStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { initDb } from './db/database';
import './i18n';
import UnlockPage from './routes/UnlockPage';
import KanbanBoard from './routes/KanbanBoard';
import StatisticsPage from './routes/StatisticsPage';
import SettingsPage from './routes/SettingsPage';
import Layout from './components/Layout';

function AppInner() {
  const isLocked = useAuthStore((s) => s.isLocked);
  const { theme: appTheme, language, initSettings } = useSettingsStore();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDb().then(() => setDbReady(true));
    initSettings();
  }, []);

  if (!dbReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isLocked) {
    return (
      <ConfigProvider
        theme={{
          token: { colorPrimary: '#fa8c16' },
        }}
        locale={language === 'zh-CN' ? zhCN : enUS}
      >
        <AntApp>
          <UnlockPage />
        </AntApp>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#fa8c16',
          borderRadius: 8,
          colorBgContainer: appTheme === 'dark' ? '#1f1f1f' : '#ffffff',
        },
        algorithm: appTheme === 'dark' ? theme.darkAlgorithm : undefined,
      }}
      locale={language === 'zh-CN' ? zhCN : enUS}
    >
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<KanbanBoard />} />
              <Route path="/statistics" element={<StatisticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}

export default function App() {
  return <AppInner />;
}
```

Note: We need to add the `useState` import at the top of App.tsx. Add `import { useState, useEffect, Suspense } from 'react';`.

- [ ] **Step 4: Commit**

```bash
git add src/components/PinInput.tsx src/routes/UnlockPage.tsx src/App.tsx && git commit -m "feat: add PIN unlock page and app shell"
```

---

### Task 9: Build layout shell with top navigation

**Files:**
- Create: `src/components/Layout.tsx`
- Create: `src/components/TopNav.tsx`

- [ ] **Step 1: Write TopNav**

```tsx
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'antd';
import { AppstoreOutlined, BarChartOutlined, SettingOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

export default function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const items = [
    { key: '/', icon: <AppstoreOutlined />, label: t('app.kanban') },
    { key: '/statistics', icon: <BarChartOutlined />, label: t('app.statistics') },
    { key: '/settings', icon: <SettingOutlined />, label: t('app.settings') },
  ];

  const selectedKey = '/' + location.pathname.split('/')[1];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      borderBottom: '1px solid #f0f0f0',
      background: '#fff',
      height: 56,
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#fa8c16' }}>
        {t('app.title')}
      </div>
      <Menu
        mode="horizontal"
        selectedKeys={[selectedKey]}
        items={items}
        onClick={({ key }) => navigate(key)}
        style={{ border: 'none', flex: 1, justifyContent: 'center' }}
      />
      <div style={{ width: 100 }} />
    </div>
  );
}
```

- [ ] **Step 2: Write Layout (Outlet wrapper)**

```tsx
import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import { useSettingsStore } from '../stores/useSettingsStore';

export default function Layout() {
  const theme = useSettingsStore((s) => s.theme);
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div style={{
      minHeight: '100vh',
      background: isDark ? '#141414' : '#fff7e6',
    }}>
      <TopNav />
      <main style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout.tsx src/components/TopNav.tsx && git commit -m "feat: add layout shell with top navigation"
```

---

### Task 10: Build kanban board with columns

**Files:**
- Create: `src/routes/KanbanBoard.tsx`
- Create: `src/components/KanbanColumn.tsx`

- [ ] **Step 1: Write KanbanColumn**

```tsx
import { useState } from 'react';
import { Card, Button, Input, Space, Typography, Badge } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { TaskWithRelations, KanbanColumn as KanbanColumnType } from '../types';
import TaskCard from './TaskCard';

const { Title } = Typography;

interface Props {
  column: KanbanColumnType;
  tasks: TaskWithRelations[];
  onAddTask: (title: string) => void;
  onDeleteColumn: () => void;
  onRenameColumn: (name: string) => void;
  onTaskClick: (task: TaskWithRelations) => void;
  canDelete: boolean;
}

export default function KanbanColumn({
  column, tasks, onAddTask, onDeleteColumn, onRenameColumn, onTaskClick, canDelete,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(column.title);

  const { setNodeRef } = useDroppable({ id: column.id });

  const handleAdd = () => {
    if (newTitle.trim()) {
      onAddTask(newTitle.trim());
      setNewTitle('');
      setAdding(false);
    }
  };

  const handleRename = () => {
    if (editName.trim()) {
      onRenameColumn(editName.trim());
      setEditing(false);
    }
  };

  return (
    <div
      style={{
        width: 320,
        minWidth: 320,
        background: '#fafafa',
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 140px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        {editing ? (
          <Input
            size="small"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onPressEnter={handleRename}
            onBlur={handleRename}
            autoFocus
            style={{ width: 120 }}
          />
        ) : (
          <Space>
            <Badge count={tasks.length} size="small" color="#fa8c16">
              <Title level={5} style={{ margin: 0, padding: '2px 8px' }}>
                {column.title}
              </Title>
            </Badge>
          </Space>
        )}
        <Space size="small">
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => { setEditName(column.title); setEditing(true); }} />
          {canDelete && (
            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={onDeleteColumn} />
          )}
        </Space>
      </div>

      <div ref={setNodeRef} style={{ flex: 1, overflowY: 'auto', minHeight: 60 }}>
        <SortableContext items={tasks.map((t) => t.id.toString())} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>
      </div>

      <div style={{ marginTop: 8 }}>
        {adding ? (
          <Input
            size="small"
            placeholder="任务标题..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onPressEnter={handleAdd}
            onBlur={() => { if (!newTitle) setAdding(false); }}
            autoFocus
          />
        ) : (
          <Button
            block
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => setAdding(true)}
          >
            添加任务
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write KanbanBoard**

```tsx
import { useState, useEffect, useMemo } from 'react';
import { Button, Input, Select, Space, Modal, Empty } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { useTaskStore } from '../stores/useTaskStore';
import KanbanColumn from '../components/KanbanColumn';
import TaskCard from '../components/TaskCard';
import TaskDrawer from '../components/TaskDrawer';
import type { TaskWithRelations, KanbanColumn as KanbanColumnType, TaskStatus } from '../types';

const DEFAULT_COLUMNS: KanbanColumnType[] = [
  { id: 'todo', title: '待办', status: 'todo' },
  { id: 'in_progress', title: '进行中', status: 'in_progress' },
  { id: 'done', title: '已完成', status: 'done' },
];

export default function KanbanBoard() {
  const { t } = useTranslation();
  const {
    tasks, categories, tags, loading,
    loadTasks, loadCategories, loadTags,
    createTask, moveTask, updateTask, deleteTask,
    addSubtask, toggleSubtask, deleteSubtask, setTaskTags,
    searchQuery, setSearchQuery,
    filterCategory, setFilterCategory,
    filterPriority, setFilterPriority,
  } = useTaskStore();

  const [columns, setColumns] = useState<KanbanColumnType[]>(DEFAULT_COLUMNS);
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);
  const [drawerTask, setDrawerTask] = useState<TaskWithRelations | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColName, setNewColName] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    loadTasks();
    loadCategories();
    loadTags();
  }, []);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) => t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    if (filterCategory !== null) {
      result = result.filter((t) => t.category_id === filterCategory);
    }
    if (filterPriority !== null) {
      result = result.filter((t) => t.priority === filterPriority);
    }
    return result;
  }, [tasks, searchQuery, filterCategory, filterPriority]);

  const getTasksByStatus = (status: TaskStatus) =>
    filteredTasks.filter((t) => t.status === status).sort((a, b) => a.sort_order - b.sort_order);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id.toString() === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = parseInt(active.id.toString());
    const overId = over.id.toString();

    // Find which column the task was dropped into
    const overColumn = columns.find((c) => c.id === overId);
    if (overColumn) {
      const tasksInCol = getTasksByStatus(overColumn.status);
      moveTask(taskId, overColumn.status, tasksInCol.length);
      return;
    }

    // Dropped on another task — reorder within same column
    const overTask = tasks.find((t) => t.id.toString() === overId);
    if (overTask) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status === overTask.status) {
        moveTask(taskId, task.status, overTask.sort_order);
      } else if (task && task.status !== overTask.status) {
        const tasksInCol = getTasksByStatus(overTask.status);
        moveTask(taskId, overTask.status, tasksInCol.length);
      }
    }
  };

  const handleAddTask = async (status: TaskStatus, title: string) => {
    const tasksInCol = getTasksByStatus(status);
    await createTask({ title, category_id: categories[0]?.id || 1, status, sort_order: tasksInCol.length });
  };

  const handleAddColumn = () => {
    if (!newColName.trim()) return;
    const id = `col_${Date.now()}`;
    setColumns([...columns, { id, title: newColName.trim(), status: id as TaskStatus }]);
    setNewColName('');
    setAddingColumn(false);
  };

  const handleDeleteColumn = (colId: string) => {
    setColumns(columns.filter((c) => c.id !== colId));
  };

  const handleRenameColumn = (colId: string, name: string) => {
    setColumns(columns.map((c) => (c.id === colId ? { ...c, title: name } : c)));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Input
            prefix={<SearchOutlined />}
            placeholder={t('kanban.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />
          <Select
            placeholder="分类"
            value={filterCategory}
            onChange={setFilterCategory}
            allowClear
            style={{ width: 120 }}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select
            placeholder="优先级"
            value={filterPriority}
            onChange={setFilterPriority}
            allowClear
            style={{ width: 120 }}
            options={[
              { value: 'high', label: t('task.high') },
              { value: 'medium', label: t('task.medium') },
              { value: 'low', label: t('task.low') },
            ]}
          />
        </Space>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={getTasksByStatus(col.status)}
              onAddTask={(title) => handleAddTask(col.status, title)}
              onDeleteColumn={() => handleDeleteColumn(col.id)}
              onRenameColumn={(name) => handleRenameColumn(col.id, name)}
              onTaskClick={setDrawerTask}
              canDelete={columns.length > 1}
            />
          ))}

          {addingColumn ? (
            <div style={{ width: 320, minWidth: 320, padding: 12, background: '#fafafa', borderRadius: 8 }}>
              <Input
                placeholder="列名称..."
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onPressEnter={handleAddColumn}
                onBlur={() => { if (!newColName) setAddingColumn(false); }}
                autoFocus
              />
            </div>
          ) : (
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => setAddingColumn(true)}
              style={{ height: 48, minWidth: 160 }}
            >
              添加列
            </Button>
          )}
        </div>

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} isDragOverlay />}
        </DragOverlay>
      </DndContext>

      <TaskDrawer
        task={drawerTask}
        categories={categories}
        tags={tags}
        onClose={() => setDrawerTask(null)}
        onUpdate={async (id, data) => { await updateTask(id, data); }}
        onDelete={async (id) => { await deleteTask(id); setDrawerTask(null); }}
        onAddSubtask={addSubtask}
        onToggleSubtask={toggleSubtask}
        onDeleteSubtask={deleteSubtask}
        onSetTags={setTaskTags}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/KanbanBoard.tsx src/components/KanbanColumn.tsx && git commit -m "feat: add kanban board with columns and drag-and-drop"
```

---

### Task 11: Build task card and task drawer

**Files:**
- Create: `src/components/TaskCard.tsx`
- Create: `src/components/TaskDrawer.tsx`

- [ ] **Step 1: Write TaskCard**

```tsx
import { Card, Tag, Typography, Progress, Space } from 'antd';
import {
  ClockCircleOutlined,
  FireOutlined,
  PushpinOutlined,
} from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TaskWithRelations } from '../types';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

const priorityColors: Record<string, string> = {
  high: '#f5222d',
  medium: '#fa8c16',
  low: '#8c8c8c',
};

interface Props {
  task: TaskWithRelations;
  onClick?: () => void;
  isDragOverlay?: boolean;
}

export default function TaskCard({ task, onClick, isDragOverlay }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id.toString(),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragOverlay ? 0.9 : 1,
  };

  const isOverdue = task.due_date && dayjs(task.due_date).isBefore(dayjs(), 'day') && task.status !== 'done';

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        size="small"
        hoverable
        onClick={onClick}
        style={{
          marginBottom: 8,
          cursor: 'grab',
          borderLeft: `3px solid ${task.category_color || '#fa8c16'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: priorityColors[task.priority],
              marginTop: 5,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Paragraph
              ellipsis={{ rows: 2 }}
              style={{
                margin: 0,
                textDecoration: task.status === 'done' ? 'line-through' : 'none',
                fontWeight: task.is_pinned ? 600 : 400,
              }}
            >
              {task.is_pinned && <PushpinOutlined style={{ color: '#fa8c16', marginRight: 4 }} />}
              {task.title}
            </Paragraph>
          </div>
        </div>

        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          {task.tags.map((tag) => (
            <Tag key={tag.id} color={tag.color} style={{ margin: 0, fontSize: 11 }}>
              {tag.name}
            </Tag>
          ))}
        </div>

        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
          <Space size={12}>
            {task.due_date && (
              <Text type={isOverdue ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                <ClockCircleOutlined style={{ marginRight: 2 }} />
                {isOverdue ? '已过期' : dayjs(task.due_date).format('MM-DD')}
              </Text>
            )}
            <Text type="secondary">
              <FireOutlined style={{ color: priorityColors[task.priority], marginRight: 2 }} />
            </Text>
          </Space>
          {task.subtask_progress.total > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {task.subtask_progress.done}/{task.subtask_progress.total}
            </Text>
          )}
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Write TaskDrawer**

```tsx
import { useState, useEffect } from 'react';
import {
  Drawer, Input, Select, DatePicker, Radio, Button, Space, Checkbox,
  Typography, Popconfirm, Divider, Tag, List,
} from 'antd';
import { PlusOutlined, DeleteOutlined, CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import type { TaskWithRelations, Category, Tag as TagType, Priority } from '../types';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface Props {
  task: TaskWithRelations | null;
  categories: Category[];
  tags: TagType[];
  onClose: () => void;
  onUpdate: (id: number, data: Partial<TaskWithRelations>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onAddSubtask: (taskId: number, title: string) => Promise<void>;
  onToggleSubtask: (id: number, isCompleted: boolean) => Promise<void>;
  onDeleteSubtask: (id: number) => Promise<void>;
  onSetTags: (taskId: number, tagIds: number[]) => Promise<void>;
}

export default function TaskDrawer({
  task, categories, tags, onClose, onUpdate, onDelete,
  onAddSubtask, onToggleSubtask, onDeleteSubtask, onSetTags,
}: Props) {
  const { t } = useTranslation();
  const [newSubtask, setNewSubtask] = useState('');

  if (!task) return null;

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      onAddSubtask(task.id, newSubtask.trim());
      setNewSubtask('');
    }
  };

  const tagOptions = tags.map((tg) => ({ value: tg.id, label: tg.name }));
  const selectedTagIds = task.tags.map((tg) => tg.id);

  return (
    <Drawer
      open={!!task}
      onClose={onClose}
      width={480}
      title={
        <Input
          variant="borderless"
          value={task.title}
          onChange={(e) => onUpdate(task.id, { title: e.target.value })}
          style={{ fontSize: 18, fontWeight: 600, padding: 0 }}
        />
      }
      extra={
        <Popconfirm
          title={t('task.deleteConfirm')}
          onConfirm={() => onDelete(task.id)}
          okText={t('common.confirm')}
          cancelText={t('common.cancel')}
        >
          <Button danger icon={<DeleteOutlined />} />
        </Popconfirm>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Priority */}
        <div>
          <Text type="secondary">{t('task.priority')}</Text>
          <Radio.Group
            value={task.priority}
            onChange={(e) => onUpdate(task.id, { priority: e.target.value })}
            style={{ marginLeft: 16 }}
          >
            <Radio.Button value="high" style={{ color: '#f5222d' }}>{t('task.high')}</Radio.Button>
            <Radio.Button value="medium" style={{ color: '#fa8c16' }}>{t('task.medium')}</Radio.Button>
            <Radio.Button value="low">{t('task.low')}</Radio.Button>
          </Radio.Group>
        </div>

        {/* Category */}
        <div>
          <Text type="secondary">{t('task.category')}</Text>
          <Select
            value={task.category_id}
            onChange={(v) => onUpdate(task.id, { category_id: v })}
            style={{ width: '100%', marginTop: 4 }}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>

        {/* Due Date */}
        <div>
          <Text type="secondary">{t('task.dueDate')}</Text>
          <DatePicker
            value={task.due_date ? dayjs(task.due_date) : null}
            onChange={(d) => onUpdate(task.id, { due_date: d?.format('YYYY-MM-DD') || null })}
            style={{ width: '100%', marginTop: 4 }}
            allowClear
          />
        </div>

        {/* Tags */}
        <div>
          <Text type="secondary">{t('task.tags')}</Text>
          <Select
            mode="multiple"
            value={selectedTagIds}
            onChange={(ids) => onSetTags(task.id, ids)}
            style={{ width: '100%', marginTop: 4 }}
            options={tagOptions}
            placeholder="选择标签"
          />
        </div>

        {/* Description */}
        <div>
          <Text type="secondary">{t('task.description')}</Text>
          <TextArea
            value={task.description}
            onChange={(e) => onUpdate(task.id, { description: e.target.value })}
            placeholder="添加描述..."
            rows={3}
            style={{ marginTop: 4 }}
          />
        </div>

        {/* Notes */}
        <div>
          <Text type="secondary">{t('task.notes')}</Text>
          <TextArea
            value={task.notes}
            onChange={(e) => onUpdate(task.id, { notes: e.target.value })}
            placeholder="添加备注..."
            rows={4}
            style={{ marginTop: 4 }}
          />
        </div>

        <Divider />

        {/* Subtasks */}
        <div>
          <Text strong>{t('task.subtasks')}</Text>
          {task.subtasks.length > 0 && (
            <List
              size="small"
              dataSource={task.subtasks}
              renderItem={(st) => (
                <List.Item
                  actions={[
                    <Button
                      key="del"
                      type="text"
                      size="small"
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => onDeleteSubtask(st.id)}
                    />,
                  ]}
                >
                  <Checkbox
                    checked={st.is_completed}
                    onChange={(e) => onToggleSubtask(st.id, e.target.checked)}
                  >
                    <Text delete={st.is_completed} style={{ fontSize: 14 }}>{st.title}</Text>
                  </Checkbox>
                </List.Item>
              )}
              style={{ marginTop: 8 }}
            />
          )}
          <Space.Compact style={{ width: '100%', marginTop: 8 }}>
            <Input
              placeholder={t('task.addSubtask')}
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onPressEnter={handleAddSubtask}
            />
            <Button icon={<PlusOutlined />} onClick={handleAddSubtask} />
          </Space.Compact>
        </div>
      </Space>
    </Drawer>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/TaskCard.tsx src/components/TaskDrawer.tsx && git commit -m "feat: add task card and task detail drawer"
```

---

### Task 12: Build statistics page

**Files:**
- Create: `src/routes/StatisticsPage.tsx`

- [ ] **Step 1: Write StatisticsPage**

```tsx
import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Typography, Segmented } from 'antd';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useTaskStore } from '../stores/useTaskStore';
import dayjs from 'dayjs';

const { Title } = Typography;

const COLORS = ['#f5222d', '#fa8c16', '#1890ff', '#52c41a', '#722ed1', '#eb2f96'];

export default function StatisticsPage() {
  const { t } = useTranslation();
  const { tasks, loadTasks } = useTaskStore();
  const [period, setPeriod] = useState<string>('week');

  useEffect(() => { loadTasks(); }, []);

  const now = dayjs();
  const periodDays = period === 'week' ? 7 : 30;

  const periodTasks = tasks.filter((t) =>
    dayjs(t.created_at).isAfter(now.subtract(periodDays, 'day'))
  );

  const completed = tasks.filter((t) => t.status === 'done').length;
  const total = tasks.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const overdue = tasks.filter(
    (t) => t.due_date && dayjs(t.due_date).isBefore(now, 'day') && t.status !== 'done'
  ).length;

  // Category distribution
  const catMap: Record<string, number> = {};
  tasks.forEach((t) => {
    catMap[t.category_name] = (catMap[t.category_name] || 0) + 1;
  });
  const catData = Object.entries(catMap).map(([name, value]) => ({ name, value }));

  // Priority breakdown
  const priMap: Record<string, number> = { high: 0, medium: 0, low: 0 };
  tasks.forEach((t) => { priMap[t.priority]++; });
  const priData = Object.entries(priMap).map(([name, value]) => ({
    name: name === 'high' ? t('task.high') : name === 'medium' ? t('task.medium') : t('task.low'),
    value,
  }));

  // Trend data
  const trendData: { date: string; created: number; completed: number }[] = [];
  for (let i = periodDays - 1; i >= 0; i--) {
    const date = now.subtract(i, 'day').format('MM-DD');
    const dayStr = now.subtract(i, 'day').format('YYYY-MM-DD');
    trendData.push({
      date,
      created: tasks.filter((t) => t.created_at.startsWith(dayStr)).length,
      completed: tasks.filter((t) => t.status === 'done' && t.updated_at.startsWith(dayStr)).length,
    });
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>{t('app.statistics')}</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card><Statistic title={t('statistics.total')} value={total} valueStyle={{ color: '#fa8c16' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title={t('statistics.completed')} value={completed} suffix={`/ ${total}`} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title={t('statistics.completionRate')} value={completionRate} suffix="%" valueStyle={{ color: '#1890ff' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title={t('task.overdue')} value={overdue} valueStyle={{ color: '#f5222d' }} /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title={t('statistics.categoryDistribution')}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t('statistics.priorityBreakdown')}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={priData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {priData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card
        title={t('statistics.trend')}
        extra={
          <Segmented
            value={period}
            onChange={(v) => setPeriod(v as string)}
            options={[
              { value: 'week', label: t('statistics.last7Days') },
              { value: 'month', label: t('statistics.last30Days') },
            ]}
          />
        }
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="created" name={t('statistics.tasksCreated')} fill="#fa8c16" radius={[4, 4, 0, 0]} />
            <Bar dataKey="completed" name={t('statistics.tasksCompleted')} fill="#52c41a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/StatisticsPage.tsx && git commit -m "feat: add statistics page with charts"
```

---

### Task 13: Build settings page

**Files:**
- Create: `src/routes/SettingsPage.tsx`

- [ ] **Step 1: Write SettingsPage**

```tsx
import { useState } from 'react';
import { Card, Button, Input, Radio, Typography, Space, Divider, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/useAuthStore';
import { useSettingsStore } from '../stores/useSettingsStore';

const { Title } = Typography;

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { changePin, lock } = useAuthStore();
  const { theme, language, setTheme, setLanguage } = useSettingsStore();

  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const handleChangePin = async () => {
    if (newPin.length < 4) {
      message.error('新密码至少需要4位');
      return;
    }
    if (newPin !== confirmPin) {
      message.error(t('settings.pinNotMatch'));
      return;
    }
    setPinLoading(true);
    const ok = await changePin(oldPin, newPin);
    if (ok) {
      message.success(t('settings.pinChanged'));
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
    } else {
      message.error(t('settings.wrongOldPin'));
    }
    setPinLoading(false);
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <Title level={4}>{t('app.settings')}</Title>

      <Card title={t('settings.changePin')} style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Input.Password
            placeholder={t('settings.oldPin')}
            value={oldPin}
            onChange={(e) => setOldPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
          />
          <Input.Password
            placeholder={t('settings.newPin')}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
          />
          <Input.Password
            placeholder={t('settings.confirmNewPin')}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
          />
          <Button type="primary" onClick={handleChangePin} loading={pinLoading}>
            {t('common.save')}
          </Button>
        </Space>
      </Card>

      <Card title={t('settings.language')} style={{ marginBottom: 16 }}>
        <Radio.Group value={language} onChange={(e) => handleLanguageChange(e.target.value)}>
          <Radio.Button value="zh-CN">中文</Radio.Button>
          <Radio.Button value="en">English</Radio.Button>
        </Radio.Group>
      </Card>

      <Card title={t('settings.theme')} style={{ marginBottom: 16 }}>
        <Radio.Group value={theme} onChange={(e) => setTheme(e.target.value)}>
          <Radio.Button value="light">{t('settings.light')}</Radio.Button>
          <Radio.Button value="dark">{t('settings.dark')}</Radio.Button>
          <Radio.Button value="system">{t('settings.system')}</Radio.Button>
        </Radio.Group>
      </Card>

      <Button danger onClick={lock}>
        锁定应用
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/SettingsPage.tsx && git commit -m "feat: add settings page with PIN change, language, and theme"
```

---

### Task 14: Update entry point and wire everything

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/tsconfig.json` (if needed for path aliases)
- Modify: `src/vite-env.d.ts` (if needed)

- [ ] **Step 1: Update main.tsx**

Read existing `main.tsx`, replace with:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 2: Verify the app builds**

```bash
cd C:/ws/Rust/tauri && npx tsc --noEmit 2>&1 | head -30
```

Expected: no type errors. Fix any that appear.

- [ ] **Step 3: Verify Vite build**

```bash
cd C:/ws/Rust/tauri && npm run build 2>&1 | tail -10
```

Expected: successful build.

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx && git commit -m "chore: update entry point and finalize wiring"
```

---

### Task 15: Final verification — Tauri build

**Files:**
- None (build verification only)

- [ ] **Step 1: Run cargo check on Rust side**

```bash
cd C:/ws/Rust/tauri && cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 2: Run Tauri dev build check**

```bash
cd C:/ws/Rust/tauri && npx tauri build --debug 2>&1 | tail -20
```

Expected: binary produced successfully.

- [ ] **Step 3: Commit any final fixes**

```bash
git add -A && git diff --cached --stat
```

If there are changes, commit them: `git commit -m "fix: resolve build issues"`.
