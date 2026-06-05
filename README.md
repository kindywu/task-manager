<p align="center">
  <h1>Task Manager</h1>
</p>

A local-first desktop task management app with a Kanban board, built with **Tauri v2 + React + SQLite**.

![](https://img.shields.io/badge/tauri-v2-orange) ![](https://img.shields.io/badge/react-18-blue) ![](https://img.shields.io/badge/bun-%3E%3D1.0-yellow)

## Features

- **Kanban Board** — drag-and-drop tasks across columns (Todo / In Progress / Done)
- **Task Management** — title, description, notes, priority, due date, tags, subtasks
- **PIN Lock** — app-level PIN protection with bcrypt hashing
- **System Tray** — minimize to tray, close dialog with hide/quit options, remember preference
- **Statistics** — dashboard with pie charts, bar charts, and summary cards
- **i18n** — Chinese and English, switchable in settings
- **Dark Mode** — light / dark / follow system
- **Lazy Loading** — route-based code splitting for faster initial load
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
│   │   ├── CloseDialog.tsx  # Close behavior dialog (hide to tray / quit)
│   │   └── ...
│   ├── routes/             # Page-level components (lazy loaded)
│   ├── stores/             # Zustand state stores
│   ├── db/                 # SQLite connection (tauri-plugin-sql)
│   ├── types/              # TypeScript interfaces
│   └── i18n/               # Chinese & English translations
├── src-tauri/              # Backend (Rust)
│   └── src/
│       ├── main.rs         # Binary entry point
│       ├── lib.rs          # Tauri commands (5) + plugin setup + tray
│       └── db.rs           # SQLite schema init + seed data
├── docs/
│   └── ARCHITECTURE.md     # Full architecture documentation
└── package.json
```

## Architecture

Two communication paths between frontend and Rust backend, plus system tray integration:

```
Frontend (React)
    │
    ├── invoke() ──────────► Rust #[tauri::command]
    │   (PIN auth, writes,      (bcrypt hash + verify,
    │    exit, tray events)       parameterized SQL writes,
    │                             system tray management)
    │
    └── tauri-plugin-sql ──► SQLite file
        (task reads SELECT)     (taskmanager.db)
```

- **PIN operations** go through Rust `invoke()` so the bcrypt hash never reaches JavaScript
- **Task reads** (SELECT) use the SQL plugin directly for flexibility (N+1 relation queries)
- **Task writes** (INSERT/UPDATE/DELETE) go through Rust `invoke()` with parameterized queries — the frontend has no `sql:allow-execute` permission
- **System tray** is managed on the Rust side; close behavior (hide to tray vs quit) is configurable with a remember-preference dialog

For a deep dive, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | KanbanBoard | Main board with drag-and-drop columns |
| `/statistics` | StatisticsPage | Charts and summary metrics |
| `/settings` | SettingsPage | PIN, language, theme, lock |

