# Task Manager — Design Spec

**Date:** 2026-06-03
**Stack:** Tauri v2 + React 18 + TypeScript + Ant Design 5 + SQLite

## Overview

A local desktop task management application. Single-user with PIN unlock. Kanban-based task management with categories, tags, subtasks, statistics, and system notifications.

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Users | Single user | Local desktop tool, no multi-tenancy needed |
| Auth | 4-6 digit PIN | Fast unlock, appropriate for local app |
| Language | zh-CN + en | react-i18next, switchable in settings |
| Visual style | Warm/soft theme | Cream background, orange accent; light+dark toggle |
| Navigation | Top nav bar | Kanban / Statistics / Settings tabs |
| Task view | Kanban board | Columns represent status, drag-and-drop cards |
| Task categorization | Category (required) + tags (optional) | Structure with flexibility |
| Notifications | Desktop notify + in-app highlight | Tauri notification plugin + overdue styling |

## Database Schema

```sql
CREATE TABLE pin (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    pin_hash  TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT '#fa8c16',
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE tags (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#fa8c16'
);

CREATE TABLE tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    notes       TEXT NOT NULL DEFAULT '',
    category_id INTEGER NOT NULL REFERENCES categories(id),
    priority    TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
    status      TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','done')),
    due_date    TEXT,
    is_pinned   INTEGER NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE subtasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id      INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE task_tags (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

CREATE TABLE notifications (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id   INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    notify_at TEXT NOT NULL,
    is_fired  INTEGER NOT NULL DEFAULT 0
);
```

## Routes & Pages

| Route | Component | Description |
|---|---|---|
| `/unlock` | UnlockPage | Full-screen PIN entry. First visit = set PIN. |
| `/` | KanbanBoard | Main workspace, top nav visible |
| `/statistics` | StatisticsPage | Completion rate, trends, distribution charts |
| `/settings` | SettingsPage | Change PIN, language, theme toggle |

The top nav bar is rendered once in the layout shell; it is hidden on `/unlock`.

## Kanban Board

### Columns

Default columns: **To Do** | **In Progress** | **Done**
- Columns are user-definable (add, rename, delete).
- Column definitions are stored in-memory/config, not in the task table (simpler; status is a freeform string on each task).

### Card

Each card shows:
- Title
- Priority color dot (red=high, orange=medium, grey=low)
- Tag badges (colored chips)
- Due date (with overdue highlight: red text + subtle pulse)
- Subtask progress: `2/5` indicator

### Interactions
- **Drag & drop**: between columns (changes status) and within column (reorder)
- **Quick create**: "+" button at column bottom, inline text input
- **Click card**: opens right-side Drawer with full task detail (subtasks, notes, edit form)

## Task Detail (Drawer)

- Edit title, description, notes inline
- Subtask list: add/check/uncheck/delete/reorder
- Category selector (dropdown)
- Tags: multi-select with create-on-the-fly
- Priority: radio group (high/medium/low)
- Due date: DatePicker
- Delete task button (with confirm)

## Statistics Page

- **Completion rate**: donut chart (completed vs total this week/month)
- **Trend**: bar/line chart — tasks created vs completed per day (last 7/30 days)
- **Category distribution**: horizontal bar chart (tasks per category)
- **Priority breakdown**: pie chart

Use a lightweight chart library (e.g., @ant-design/charts or recharts).

## Notifications

- Tauri plugin: `tauri-plugin-notification`
- On app start, Rust side scans `notifications` table for unfired notifications where `notify_at <= now`
- Fires system notification with task title
- In the UI, overdue tasks get red highlight on the kanban card

## Settings Page

- **Change PIN**: old PIN → new PIN → confirm new PIN
- **Language**: radio group (中文 / English)
- **Theme**: radio group (Light / Dark / System)

## Tech Stack Details

| Concern | Choice |
|---|---|
| Desktop shell | Tauri v2 |
| Frontend framework | React 18 + TypeScript |
| UI components | Ant Design 5 |
| Routing | react-router-dom v6 |
| State management | Zustand |
| i18n | react-i18next + i18next |
| SQLite bindings | tauri-plugin-sql (official) |
| Charts | recharts |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable |
| Notifications | tauri-plugin-notification |
| Build tool | Vite (Tauri default) |

## Project Structure

```
src/
├── main.tsx                 # Entry point
├── App.tsx                  # Router + layout shell
├── routes/
│   ├── UnlockPage.tsx
│   ├── KanbanBoard.tsx
│   ├── StatisticsPage.tsx
│   └── SettingsPage.tsx
├── components/
│   ├── TopNav.tsx
│   ├── KanbanColumn.tsx
│   ├── TaskCard.tsx
│   ├── TaskDrawer.tsx
│   ├── PinInput.tsx
│   └── ...
├── stores/
│   ├── useAuthStore.ts
│   ├── useTaskStore.ts
│   └── useSettingsStore.ts
├── db/
│   └── database.ts          # SQLite init + query helpers
├── i18n/
│   ├── index.ts
│   ├── zh-CN.json
│   └── en.json
├── hooks/
│   └── ...
└── types/
    └── index.ts

src-tauri/
├── Cargo.toml
├── tauri.conf.json
├── capabilities/
│   └── default.json
└── src/
    ├── main.rs
    ├── lib.rs
    └── db.rs                # Rust-side DB init, notification scan
```

## Scope Boundaries

**In scope:**
- PIN unlock (set, change, verify)
- Full CRUD for tasks, categories, tags, subtasks
- Kanban board with drag & drop
- Task search & filter (by category, tag, priority, status, keyword)
- Statistics dashboard
- System notifications for due tasks
- Light/dark theme toggle
- zh-CN / en language switch
