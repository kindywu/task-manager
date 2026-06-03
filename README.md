<p align="center">
  <h1>Task Manager</h1>
</p>

A local-first desktop task management app with a Kanban board, built with **Tauri v2 + React + SQLite**.

![](https://img.shields.io/badge/tauri-v2-orange) ![](https://img.shields.io/badge/react-18-blue) ![](https://img.shields.io/badge/bun-%3E%3D1.0-yellow)

## Features

- **Kanban Board** — drag-and-drop tasks across columns (Todo / In Progress / Done)
- **Task Management** — title, description, notes, priority, due date, tags, subtasks
- **PIN Lock** — app-level PIN protection with bcrypt hashing
- **Statistics** — dashboard with pie charts, bar charts, and summary cards
- **i18n** — Chinese and English, switchable in settings
- **Dark Mode** — light / dark / follow system
- **Fully Offline** — all data stored in local SQLite, zero network requests

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | Tauri v2 (Rust) |
| Frontend | React 18 + TypeScript |
| UI components | Ant Design 5 |
| Drag and drop | @dnd-kit |
| Charts | Recharts |
| State management | Zustand |
| Routing | React Router v7 (HashRouter) |
| Database | SQLite (rusqlite + tauri-plugin-sql) |
| Build | Vite + bun |

## Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [bun](https://bun.sh) >= 1.0
- Platform-specific WebView (pre-installed on Windows 10+, macOS, and most Linux desktops)

## Getting Started

```bash
# Clone the repo
git clone <repo-url>
cd task-manager

# Install frontend dependencies
bun install

# Start dev mode
bun run tauri dev
```

## Build

```bash
bun run tauri build
```

The output binary will be in `src-tauri/target/release/`.

## Project Structure

```
├── src/                    # Frontend (React + TypeScript)
│   ├── components/         # Reusable UI components
│   ├── routes/             # Page-level components
│   ├── stores/             # Zustand state stores
│   ├── db/                 # SQLite connection (tauri-plugin-sql)
│   ├── types/              # TypeScript interfaces
│   └── i18n/               # Chinese & English translations
├── src-tauri/              # Backend (Rust)
│   └── src/
│       ├── main.rs         # Binary entry point
│       ├── lib.rs          # Tauri commands + plugin setup
│       └── db.rs           # SQLite schema init + seed data
├── docs/
│   └── ARCHITECTURE.md     # Full architecture documentation
└── package.json
```

## Architecture

Two communication paths between frontend and Rust backend:

```
Frontend (React)
    │
    ├── invoke() ──────────► Rust #[tauri::command]
    │   (PIN auth only)       (bcrypt hash + verify)
    │
    └── tauri-plugin-sql ──► SQLite file
        (task CRUD)            (taskmanager.db)
```

- **PIN operations** go through Rust `invoke()` so the bcrypt hash never reaches JavaScript
- **Task CRUD** uses the SQL plugin directly for simplicity and performance

For a deep dive, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | KanbanBoard | Main board with drag-and-drop columns |
| `/statistics` | StatisticsPage | Charts and summary metrics |
| `/settings` | SettingsPage | PIN, language, theme, lock |

