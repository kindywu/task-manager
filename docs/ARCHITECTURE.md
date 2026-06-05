# Task Manager — 架构与技术文档

> 读者定位：本文假设你有基本的 React/TypeScript 和 SQL 知识，但对 **Tauri 框架是新手**。第 2 章专门解释 Tauri 的核心概念，帮助快速上手。

## 目录

1. [项目概览](#1-项目概览)
2. [Tauri 核心概念速览（新手必读）](#2-tauri-核心概念速览新手必读)
3. [技术栈](#3-技术栈)
4. [整体架构](#4-整体架构)
5. [启动流程](#5-启动流程)
6. [运行时依赖关系](#6-运行时依赖关系)
7. [Rust 后端](#7-rust-后端)
8. [React 前端](#8-react-前端)
9. [数据库设计](#9-数据库设计)
10. [数据流](#10-数据流)
11. [组件树与路由](#11-组件树与路由)
12. [构建流水线](#12-构建流水线)

---

## 1. 项目概览

**Task Manager** 是一款基于 Tauri v2 的本地桌面任务管理应用。核心交互采用看板（Kanban）模式，支持拖拽排序、分类筛选、标签管理、子任务清单、PIN 码锁定、数据统计等完整功能。

- **纯本地运行**：所有数据存储在本地 SQLite 文件中，无任何网络请求
- **双语言支持**：中文 / 英文可切换
- **明暗主题**：浅色 / 深色 / 跟随系统
- **PIN 码保护**：bcrypt 哈希存储在 SQLite 中，验证逻辑运行在 Rust 侧
- **系统托盘**：关闭窗口时最小化到托盘，支持隐藏/退出选项并记忆偏好
- **懒加载**：页面级代码分割，首屏加载更快

---

## 2. Tauri 核心概念速览（新手必读）

如果你刚接触 Tauri，先花 5 分钟了解这几个概念，后面读起来会顺畅很多。

### 2.1 Tauri 是什么？

Tauri 是一个**用 Web 技术写 UI、用 Rust 写后端逻辑**的桌面应用框架。你可以把它理解为轻量级的 Electron 替代品——但它不打包 Chromium，而是复用操作系统自带的 WebView。

```
┌──────────────────────────────────────────┐
│              你的 Tauri 应用              │
│                                          │
│  ┌────────────┐      ┌───────────────┐   │
│  │  前端 (JS)  │ ←→   │  后端 (Rust)   │   │
│  │  React 等   │      │  指令/插件     │   │
│  └─────┬──────┘      └──────┬────────┘   │
│        │ 运行在              │ 运行在      │
│  ┌─────┴──────┐      ┌──────┴────────┐   │
│  │ 系统 WebView │      │  Rust 原生进程  │   │
│  │ (Edge/Safari)│      │  (直接调 OS API)│   │
│  └────────────┘      └───────────────┘   │
│                                          │
│  最终产物: 一个可执行文件 (几 MB)          │
└──────────────────────────────────────────┘
```

**核心特点：**
- 前端部分就是普通的 HTML/CSS/JS，你可以用 React、Vue、Svelte 等任何框架
- 后端部分用 Rust 编写，编译成原生机器码，性能极高
- 前端和后端之间通过 **IPC**（进程间通信）互相调用
- 应用体积小（通常 3-10 MB），因为没有自带浏览器内核

### 2.2 Tauri 指令（Command）—— Rust 暴露给 JS 的函数

这是 Tauri 最核心的通信机制。**你在 Rust 中定义一个函数，加 `#[tauri::command]` 注解，它就能被前端 JS 调用。**

```rust
// Rust 侧：定义一个指令
#[tauri::command]
fn verify_pin(state: tauri::State<'_, Database>, pin: String) -> Result<bool, String> {
    // ... 业务逻辑 ...
    Ok(true)
}

// 在 run() 中注册
.invoke_handler(tauri::generate_handler![verify_pin])
```

```typescript
// 前端侧：调用这个指令
import { invoke } from '@tauri-apps/api/core';

const ok = await invoke<boolean>('verify_pin', { pin: '123456' });
//        函数名 ^^^^^^^^^^^           参数对象 ^^^^^^^^^^^^^^^^
```

**类比**：就像前端的 `fetch('/api/xxx')`，但这里的"API 服务端"是本地的 Rust 代码，不走网络，直接通过 IPC 通信，极快且安全。

> 在本项目中，PIN 认证和所有数据**写操作**使用 `invoke()` 方式。读操作走的是另一条路——`tauri-plugin-sql` 插件，下面马上讲。

### 2.3 Tauri 插件（Plugin）—— 给前端提供原生能力

插件是 Tauri 生态中的"能力扩展包"。它封装了某项原生功能，让前端可以直接调用，而不需要你自己写 Rust 指令。

**本项目中用到了两个插件：**

| 插件 | 作用 | 前端怎么用 |
|------|------|-----------|
| `tauri-plugin-sql` | 让 JS 能直接操作 SQLite 数据库 | `import Database from '@tauri-apps/plugin-sql'` |
| `tauri-plugin-notification` | 发送系统桌面通知 | `import { sendNotification } from '@tauri-apps/plugin-notification'` |

**插件的工作方式：**
- 在 Rust 侧通过 `.plugin(xxx)` 注册
- 在 `capabilities/default.json` 中声明权限
- 前端通过 npm 安装对应包后直接 import 使用

```rust
// Rust 侧：注册插件
tauri::Builder::default()
    .plugin(tauri_plugin_sql::Builder::new().build())  // 让前端能用 SQL
    .plugin(tauri_plugin_notification::init())          // 让前端能发通知
```

```json
// capabilities/default.json：声明允许前端使用哪些插件能力
{
  "permissions": [
    "sql:allow-load",              // 允许 Database.load()
    "sql:allow-select",            // 允许 SELECT 查询
    // 注意：没有 sql:allow-execute —— 前端不能执行 INSERT/UPDATE/DELETE
    "notification:allow-notify"    // 允许前端发通知
  ]
}
```

> 本项目**读取**走 `tauri-plugin-sql`（前端直接 SELECT，灵活组合查询），**写入**走 Rust `invoke()` 指令（通过 `commands.rs` 中 16 个指令完成，参数化查询防注入）。这是安全与便利之间的平衡——读的自由度交给前端，写的控制权留在 Rust。

### 2.4 托管状态（Managed State）—— Rust 中的全局共享数据

Tauri 提供 `app.manage(xxx)` 机制，让你把一个 Rust 对象注入到"应用全局"，之后所有 `#[tauri::command]` 都能通过函数参数拿到它。

```rust
// 注入阶段（在 setup 闭包中）：
app.manage(database);  // 把 Database 实例放到全局

// 使用阶段（在任意指令函数中）：
#[tauri::command]
fn has_pin(state: tauri::State<'_, Database>) -> Result<bool, String> {
    // state 就是之前注入的 Database 实例
    // tauri::State 是 Tauri 提供的"从全局取数据"的类型
}
```

**类比**：类似 React 的 Context 或者后端框架的依赖注入——不用手动传来传去，Tauri 自动帮你注入。

> 本项目通过 `app.manage()` 注入了 `Database` 实例。四个 PIN 指令函数都通过 `State<Database>` 参数拿到它。

### 2.5 插件权限（Capabilities）—— Tauri v2 的安全模型

Tauri v2 采用细粒度的权限系统。**前端能调用哪些插件能力，必须在 `capabilities/default.json` 中显式声明。**

```
前端想执行 SQL → Tauri 检查 capabilities 中是否有 "sql:allow-execute"
                → 有 → 放行
                → 没有 → 拒绝，前端收到错误
```

这是一个**白名单机制**——默认什么都做不了，必须显式授权。这在安全上比 Electron 的 `nodeIntegration: true` 强得多。

### 2.6 invoke()、插件、以及「读写分离」的实际选择

本项目的做法不是非此即彼，而是按"读/写"拆分：

| 操作类型 | 通信方式 | 原因 |
|---------|---------|------|
| **读** (SELECT) | `tauri-plugin-sql` | 前端需要灵活的关联查询（N+1 模式组装 TaskWithRelations），插件直连 SQLite 最直接 |
| **写** (INSERT/UPDATE/DELETE) | `invoke()` → Rust `#[tauri::command]` | 所有变更走 Rust，参数化查询，不会意外执行 DROP/TRUNCATE |
| **PIN 认证** | `invoke()` | bcrypt 哈希不出 Rust 进程 |

**为什么不全用 invoke？** 如果读操作也走 Rust 指令，每个查询都需要定义返回类型结构体、序列化为 JSON、IPC 传输——对于需要灵活组合的关联查询（任务 + 分类 + 标签 + 子任务），这既不灵活也增加性能开销。

**为什么不全用插件？** 如果写操作也走插件，需要授予 `sql:allow-execute` 权限，前端就拿到了完整的数据库修改能力。去掉这个权限，前端最多能 SELECT，任何修改都被 Tauri IPC 层拦截。

**capabilities 中的实际权限：**

```json
"sql:default", "sql:allow-load", "sql:allow-select"
// 故意没有 "sql:allow-execute"
```

### 2.7 Tauri 应用的生命周期

```
cargo tauri dev / 双击 .exe
        │
        ▼
┌──────────────────────┐
│  Rust main() 启动     │  ← 应用进程开始
│  注册插件             │
│  初始化数据库          │
│  创建 WebView 窗口     │  ← 系统弹出窗口
│  加载前端 HTML        │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│  WebView 解析 HTML    │
│  执行 JS bundle       │
│  React 渲染 UI        │  ← 用户看到界面
│  Zustand 初始化状态    │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│  运行中...            │  ← 用户在操作
│  JS ←→ Rust 通过     │
│  IPC 不断通信         │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│  用户关闭窗口          │  ← 进程终止
│  Rust drop() 清理     │
│  数据库连接关闭        │
└──────────────────────┘
```

---

## 3. 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| **桌面框架** | Tauri v2 | 将 Web 前端嵌入系统 WebView，提供 Rust ↔ JS 双向通信 |
| **后端语言** | Rust | PIN 认证指令、数据库初始化、插件注册 |
| **前端框架** | React 18 + TypeScript | 全部 UI 逻辑 |
| **UI 组件库** | Ant Design 5 | 按钮、表单、抽屉、菜单、日期选择等组件 |
| **拖拽** | @dnd-kit/core + sortable | 看板卡片拖拽排序 |
| **图表** | Recharts 3 | 统计页的饼图和柱状图 |
| **状态管理** | Zustand 5 | 认证状态、任务数据、设置偏好 |
| **路由** | React Router DOM v7 (HashRouter) | 前端页面路由 |
| **国际化** | i18next + react-i18next | 中英文切换 |
| **数据库** | SQLite (rusqlite for writes + tauri-plugin-sql for reads) | 本地数据持久化，读写分离 |
| **密码哈希** | bcrypt (Rust crate) | PIN 码安全存储 |
| **构建工具** | Vite 5 + bun | 前端打包与依赖管理 |
| **日期处理** | dayjs | 日期格式化与计算 |

---

## 4. 整体架构

```mermaid
graph TB
    subgraph "User Desktop"
        WV["System WebView - Windows: WebView2 - macOS: WKWebView - Linux: WebKitGTK"]
    end

    subgraph "Tauri v2 Runtime"
        subgraph "Rust Backend"
            MAIN["main.rs - Entry Point"]
            LIB["lib.rs - 5 Tauri Commands - + Plugin + Tray Setup"]
            CMDS["commands.rs - 16 Write Commands"]
            DB_RS["db.rs - Database Struct - Mutex Connection"]
            TRAY["System Tray - Show / Quit Menu"]
        end
        subgraph "Tauri Plugins"
            SQL_PLUGIN["tauri-plugin-sql - Frontend SQLite Access"]
            NOTIF_PLUGIN["tauri-plugin-notification - System Notifications"]
        end
    end

    subgraph "Frontend - React + TypeScript"
        APP["App.tsx - Root Component"]
        ROUTER["HashRouter"]
        subgraph "Pages"
            KANBAN["KanbanBoard"]
            STATS["StatisticsPage"]
            SETTINGS["SettingsPage"]
            UNLOCK["UnlockPage"]
        end
        subgraph "State Management - Zustand"
            AUTH_STORE["useAuthStore"]
            TASK_STORE["useTaskStore"]
            SETTINGS_STORE["useSettingsStore"]
        end
        DB_FE["db/database.ts - SQLite Connection Singleton"]
    end

    subgraph "Persistence"
        DB_FILE[("taskmanager.db - SQLite File - WAL Mode")]
        LS["localStorage - Theme / Language Prefs"]
    end

    MAIN --> LIB
    LIB --> DB_RS
    LIB --> SQL_PLUGIN
    LIB --> NOTIF_PLUGIN
    DB_RS --> DB_FILE
    DB_FE -->|tauri-plugin-sql SELECT only| DB_FILE
    AUTH_STORE -->|invoke| LIB
    TASK_STORE -->|invoke writes| LIB
    TASK_STORE -->|plugin reads| DB_FE
    WV --> MAIN
    APP --> ROUTER
    ROUTER --> KANBAN
    ROUTER --> STATS
    ROUTER --> SETTINGS
    APP --> UNLOCK
    KANBAN --> TASK_STORE
    STATS --> TASK_STORE
    SETTINGS --> AUTH_STORE
    SETTINGS --> SETTINGS_STORE
    UNLOCK --> AUTH_STORE
    TASK_STORE --> DB_FE
    SETTINGS_STORE --> LS
```


### 架构要点

**双 SQLite 连接 + 读写分离（理解本项目架构的关键）：**

Rust 侧通过 `rusqlite` 持有一个连接，**用于 PIN 操作和所有写操作**。前端通过 `tauri-plugin-sql` 持有另一个连接，**仅用于 SELECT 查询**。两者操作同一个 `taskmanager.db` 文件。

```
读操作 (3 种):  Frontend ──tauri-plugin-sql──► SQLite   (SELECT only)
写操作 (16 种): Frontend ──invoke()──► Rust ──rusqlite──► SQLite   (INSERT/UPDATE/DELETE)
PIN 操作 (4 种): Frontend ──invoke()──► Rust ──rusqlite──► SQLite   (bcrypt)
```

为什么这样设计？

- **安全性**：PIN 的 bcrypt 哈希和所有写操作的 SQL 执行都在 Rust 侧完成。前端没有 `sql:allow-execute` 权限，最多只能 SELECT，无法执行 DROP/INSERT/UPDATE/DELETE。
- **灵活性**：读取操作中前端需要做 N+1 关联查询（任务 → 分类/标签/子任务），直接在 JS 侧组合 SQL 比每步都走 IPC 更灵活高效。
- **权限边界**：Tauri v2 的 capabilities 白名单保证了即使前端代码被篡改，也无法修改数据库——`sql:allow-execute` 不在白名单中。

---

## 5. 启动流程

这是整个应用从双击到用户看到界面的完整过程。

```mermaid
sequenceDiagram
    participant OS as OperatingSystem
    participant BIN as main.rs
    participant LIB as lib.rs
    participant DB as Database
    participant WV as WebView
    participant PLUGIN as tauri-plugin-sql
    participant REACT as React App
    participant STORE as Zustand Stores

    OS->>BIN: launch executable
    BIN->>LIB: task_manager_lib run
    LIB->>LIB: register tauri-plugin-sql
    LIB->>LIB: register tauri-plugin-notification
    LIB->>LIB: execute setup closure
    LIB->>OS: get app_data_dir platform-specific
    LIB->>DB: Database new with app_dir
    DB->>DB: fs create_dir_all
    DB->>DB: open taskmanager.db
    DB->>DB: PRAGMA journal_mode=WAL
    DB->>DB: PRAGMA foreign_keys=ON
    DB->>DB: init_tables - create 7 tables
    DB->>DB: seed_categories - insert 3 defaults
    DB-->>LIB: Database instance
    LIB->>LIB: app.manage database
    LIB->>LIB: build system tray with menu
    LIB->>LIB: register 21 invoke_handlers
    LIB->>OS: create WebView window 1200x800
    LIB->>WV: load frontend assets
    WV->>WV: execute Vite bundled JS
    WV->>REACT: ReactDOM createRoot to App
    REACT->>PLUGIN: getDb - Database.load sqlite taskmanager.db
    PLUGIN-->>REACT: SQLite connection handle
    REACT->>STORE: initSettings - restore theme and lang from localStorage
    REACT->>STORE: useAuthStore checkPinStatus
    STORE->>LIB: invoke has_pin
    LIB->>DB: SELECT COUNT FROM pin
    DB-->>LIB: count
    LIB-->>STORE: bool

    alt No PIN - first run
        STORE->>REACT: isFirstRun=true, isLocked=true
        REACT->>WV: render UnlockPage - PIN creation
    else PIN exists
        STORE->>REACT: isFirstRun=false, isLocked=true
        REACT->>WV: render UnlockPage - PIN input
    end

    Note over REACT,WV: User enters correct PIN

    STORE->>LIB: invoke verify_pin
    LIB->>DB: SELECT pin_hash then bcrypt verify
    LIB-->>STORE: true
    STORE->>REACT: isLocked=false
    REACT->>STORE: useTaskStore loadTasks
    STORE->>PLUGIN: SELECT FROM tasks with joins
    PLUGIN-->>STORE: task data
    REACT->>STORE: useTaskStore loadCategories
    REACT->>STORE: useTaskStore loadTags
    REACT->>WV: render main UI - Layout + KanbanBoard
```


---

## 6. 运行时依赖关系

```mermaid
graph LR
    subgraph "Tauri Process"
        RUST[Rust Runtime]
        WEBVIEW[WebView Process]
    end
    subgraph "System Components"
        WV2[WebView2 / WKWebView / WebKitGTK]
        FS[File System]
        NOTIF[System Notification Service]
    end
    subgraph "Files"
        DB_FILE[(taskmanager.db)]
        DIST[dist/ Static Assets]
    end
    RUST -->|spawn subprocess| WEBVIEW
    WEBVIEW -->|render| WV2
    RUST -->|rusqlite| DB_FILE
    WEBVIEW -->|tauri-plugin-sql| DB_FILE
    RUST -->|read/write| FS
    RUST -->|tauri-plugin-notification| NOTIF
    WEBVIEW -->|invoke IPC| RUST
    WEBVIEW -->|load| DIST
```

| 运行时依赖 | 来源 | 说明 |
|------------|------|------|
| **系统 WebView** | 操作系统自带 | Windows: WebView2 (Edge Chromium)，macOS: WKWebView，Linux: WebKitGTK。用户无需额外安装 |
| **SQLite** | `rusqlite` bundled 编译 | SQLite 引擎静态编译进 Rust 二进制，无需系统安装 SQLite |
| **Vite 开发服务器** | `bun run dev` | 仅开发模式，监听 `localhost:1420`，支持 HMR 热更新 |
| **文件系统** | 操作系统 | 读写 `app_data_dir` 下的数据库文件；`localStorage` 由 WebView 管理 |

**平台数据目录（`app_data_dir`）：**

| 平台 | 路径 |
|------|------|
| Windows | `C:\Users\<user>\AppData\Roaming\com.taskmanager.app\` |
| macOS | `~/Library/Application Support/com.taskmanager.app/` |
| Linux | `~/.local/share/com.taskmanager.app/` |

---

## 7. Rust 后端

### 7.1 文件结构

```
src-tauri/
├── Cargo.toml              # Rust 包清单与依赖声明
├── build.rs                # Tauri 构建脚本（1 行，调 tauri_build::build()）
├── tauri.conf.json         # Tauri 窗口与构建配置
├── capabilities/
│   └── default.json        # 插件权限白名单（Tauri v2 安全模型）
├── icons/                  # 各平台应用图标
└── src/
    ├── main.rs             # 二进制入口 (5 行)
    ├── lib.rs              # 核心逻辑: 21 个指令注册 + 插件 + 系统托盘 + 启动
    ├── commands.rs         # 16 个写操作指令（tasks/categories/tags/subtasks）
    └── db.rs               # 数据库初始化: 建表 + 种子数据
```

### 7.2 main.rs — 二进制入口

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    task_manager_lib::run()
}
```

- `#![cfg_attr(...)]`：在 release 构建中隐藏 Windows 控制台窗口（用户看不到黑框）
- 全部逻辑委托给 `task_manager_lib::run()`
- 库 crate (`lib.rs`) 包含所有实际代码，二进制 crate (`main.rs`) 只是一个极薄的入口

### 7.3 lib.rs — 核心启动与指令

#### run() 函数的执行流程

```mermaid
flowchart TD
    START([run called]) --> P1["register tauri-plugin-sql - frontend SELECT access"]
    P1 --> P2["register tauri-plugin-notification - system notifications"]
    P2 --> SETUP[setup closure]
    SETUP --> S1["resolve app_data_dir - platform-specific path"]
    S1 --> S2["Database new with app_dir - create tables and seed data"]
    S2 --> S3["app.manage database - inject as Tauri managed state"]
    S3 --> TRAY["build system tray icon with menu - Show Window / Quit"]
    TRAY --> REG["register 21 invoke_handlers - 5 PIN/auth plus 16 write commands"]
    REG --> RUN["tauri generate_context and run"]
```

#### PIN 认证指令（5 个，定义在 lib.rs）

| 指令名 | 入参 | 返回值 | 做了什么 |
|--------|------|--------|---------|
| `verify_pin` | `pin: String` | `Result<bool, String>` | 查库取 `pin_hash`，`bcrypt::verify()` 比对 |
| `set_pin` | `pin: String` | `Result<(), String>` | `bcrypt::hash(pin, 4)` → DELETE 旧记录 → INSERT 新哈希 |
| `change_pin` | `old_pin, new_pin` | `Result<bool, String>` | 先验证旧 PIN，再写入新哈希 |
| `has_pin` | 无 | `Result<bool, String>` | `SELECT COUNT(*) FROM pin` → count > 0 |
| `exit_app` | 无 | 无（直接调用 `app.exit(0)`） | 关闭主窗口后延迟 2 秒退出进程（给 WebView2 清理时间），确保托盘不阻止退出 |

**bcrypt cost factor 为什么是 4？** 通常是 12-14。这里用 4 是刻意降低计算成本——桌面端的 PIN 很短（4-6 位数字），验证需要在毫秒级完成，cost=4 足够对付本地攻击场景（攻击者需要先突破操作系统才能拿到 db 文件）。

#### 系统托盘设置

在 `setup()` 闭包中，应用创建一个托盘图标并注册以下行为：

- **托盘菜单**：`Show Window`（调用 `w.show()` + `w.set_focus()`）、`Quit`（emit `tray-quit` 事件，前端收到后调用 `exit_app` 指令）
- **左键点击托盘图标**：显示主窗口并聚焦
- **`exit_app` 指令**：先关闭 WebView 窗口，然后启动一个 2 秒延迟线程后调 `app.exit(0)`。延迟是为了给 Windows WebView2 足够时间释放窗口句柄，避免进程残留

> 因为系统托盘会让 Tauri 保持在后台运行，所以简单的 `window.close()` 不够——必须调用 `app.exit(0)` 强制退出整个进程。

### 7.4 commands.rs — 16 个写操作指令

所有写操作集中在此文件，每个指令通过 `State<Database>` 获取 Rust 侧的 `rusqlite` 连接，使用参数化查询（`?1`, `?2`）防止 SQL 注入。输入类型用 `serde::Deserialize` 从 invoke 参数自动反序列化。

#### 任务写指令

| 指令名 | 入参 | 返回值 | 做了什么 |
|--------|------|--------|---------|
| `create_task` | `data: CreateTaskData` | `Result<i64, String>` | INSERT INTO tasks，返回新 ID |
| `update_task` | `id, data: UpdateTaskData` | `Result<(), String>` | 动态构建 SET 子句，仅更新传入的字段 |
| `delete_task` | `id` | `Result<(), String>` | DELETE（CASCADE 清理子表） |
| `move_task` | `id, status, sort_order` | `Result<(), String>` | UPDATE status + sort_order |


#### 分类写指令

| 指令名 | 入参 | 返回值 |
|--------|------|--------|
| `create_category` | `name, color` | `Result<(), String>` |
| `update_category` | `id, data: UpdateCategoryData` | `Result<(), String>` |
| `delete_category` | `id` | `Result<(), String>` |

#### 标签写指令

| 指令名 | 入参 | 返回值 |
|--------|------|--------|
| `create_tag` | `name, color` | `Result<(), String>` |
| `delete_tag` | `id` | `Result<(), String>` |
| `set_task_tags` | `task_id, tag_ids: Vec<i64>` | `Result<(), String>` |

#### 子任务写指令

| 指令名 | 入参 | 返回值 |
|--------|------|--------|
| `add_subtask` | `task_id, title` | `Result<(), String>` |
| `toggle_subtask` | `id, is_completed` | `Result<(), String>` |
| `delete_subtask` | `id` | `Result<(), String>` |

**动态 UPDATE 实现**（`update_task`、`update_category`）：遍所传入字段中 `Some` 的键，动态拼接 `SET col = ?N` 子句和参数数组。`due_date` 使用 `Option<Option<String>>` 类型区分「不更新」(None)、「设为 NULL」(Some(None))、「设为值」(Some(Some(v))) 三种状态。

### 7.4 db.rs — 数据库层

```rust
pub struct Database {
    pub conn: Mutex<Connection>,  // rusqlite::Connection 外包一层 Mutex
}
```

**为什么用 `Mutex`？** 因为 Tauri 可能在多个线程上并发调用指令函数（例如同时收到两个 `verify_pin` 调用）。`rusqlite::Connection` 不是线程安全的，必须用 `Mutex` 保护。

**初始化步骤：**

1. `fs::create_dir_all(&app_dir)` — 确保数据目录存在（幂等操作）
2. `Connection::open(db_path)` — 打开或创建 `taskmanager.db`
3. `PRAGMA journal_mode=WAL` — 开启 WAL 模式，允许 Rust 和前端同时持有读连接
4. `PRAGMA foreign_keys=ON` — 启用外键约束，确保数据完整性
5. `init_tables()` — 创建 7 张表（全部 `IF NOT EXISTS`，幂等）
6. `seed_categories()` — 若 `categories` 表为空，插入 3 条默认记录

### 7.5 Cargo.toml 依赖说明

```toml
[dependencies]
tauri = "2"                                    # Tauri 框架核心
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
                                               # SQL 插件（含 SQLite 支持）
tauri-plugin-notification = "2"                # 通知插件
serde = { version = "1", features = ["derive"] }
serde_json = "1"                               # JSON 序列化（指令参数的编解码）
bcrypt = "0.16"                                # PIN 哈希
rusqlite = { version = "0.32", features = ["bundled"] }
                                               # SQLite 引擎（bundled = 静态编译）

[build-dependencies]
tauri-build = "2"                              # 构建时代码生成
```

**`features = ["bundled"]` 是什么意思？** 它让 `rusqlite` 在编译时把 SQLite 的 C 源码一起编译进二进制，用户机器上不需要安装 SQLite。

### 7.6 插件权限 (capabilities/default.json)

Tauri v2 的安全模型要求**显式授权**。以下是本项目声明的权限：

```json
{
  "identifier": "default",
  "permissions": [
    "core:default",                              // Tauri 核心功能（窗口、事件等）
    "core:window:allow-hide",                    // 允许窗口隐藏（最小化到托盘）
    "core:window:allow-show",                    // 允许窗口显示（从托盘恢复）
    "core:window:allow-close",                   // 允许窗口关闭（退出应用）
    "sql:default",                               // SQL 插件基础权限
    "sql:allow-load",                            // 允许 Database.load()
    "sql:allow-execute",                         // 允许 execute()（INSERT/UPDATE/DELETE）
    "sql:allow-select",                          // 允许 select()（SELECT 查询）
    "notification:default",                      // 通知插件基础权限
    "notification:allow-notify",                 // 允许发送通知
    "notification:allow-is-permission-granted",  // 允许查询通知权限状态
    "notification:allow-request-permission"      // 允许请求通知权限
  ]
}
```

如果前端代码调用了未声明的能力，Tauri 会直接拒绝并报错。

---

## 8. React 前端

### 8.1 文件结构

```
src/
├── main.tsx                    # ReactDOM.createRoot 挂载点
├── App.tsx                     # 根组件：Provider 嵌套 + 路由 + 认证门控
├── vite-env.d.ts               # Vite 类型声明
├── types/
│   └── index.ts                # 所有 TypeScript 类型定义（~50 行）
├── db/
│   └── database.ts             # SQLite 连接单例（通过 tauri-plugin-sql）
├── i18n/
│   ├── index.ts                # i18next 初始化配置
│   ├── zh-CN.json              # 中文翻译 (~50 个 key)
│   └── en.json                 # 英文翻译 (~50 个 key)
├── stores/
│   ├── useAuthStore.ts         # 认证状态：调用 invoke() 与 Rust 通信
│   ├── useTaskStore.ts         # 任务 CRUD：读用插件 / 写用 invoke()
│   └── useSettingsStore.ts     # 主题/语言偏好：持久化到 localStorage
├── components/
│   ├── Layout.tsx              # 布局壳：TopNav + Outlet
│   ├── TopNav.tsx              # 顶部导航栏（Kanban / 统计 / 设置）
│   ├── KanbanColumn.tsx        # 看板列：可放置 + 可排序
│   ├── TaskCard.tsx            # 任务卡片：可拖拽
│   ├── TaskDrawer.tsx          # 任务编辑抽屉（右侧滑出）
│   ├── CloseDialog.tsx         # 关闭选项对话框（隐藏到托盘 / 退出）
│   └── PinInput.tsx            # PIN 码输入组件
└── routes/
    ├── UnlockPage.tsx          # 解锁/设置 PIN 页面
    ├── KanbanBoard.tsx         # 看板主页（拖拽容器）
    ├── StatisticsPage.tsx      # 统计仪表盘
    └── SettingsPage.tsx        # 设置页面
```

### 8.2 App.tsx — 根组件的条件渲染逻辑

```mermaid
flowchart TD
    APP_START(["App Component Mounts"]) --> INIT_DB["getDb - SQLite Connection via tauri-plugin-sql"]
    INIT_DB --> INIT_SET["initSettings - Restore Theme and Lang from localStorage"]
    INIT_DB --> LISTEN["listen for tray-quit event and onCloseRequested"]
    INIT_SET --> DB_READY{"DB Ready?"}

    DB_READY -->|No| SPINNER["Show Spin Loader"]
    DB_READY -->|Yes| LOCKED{isLocked?}

    LOCKED -->|Yes| UNLOCK["Render UnlockPage with ConfigProvider and AntApp"]
    LOCKED -->|No| MAIN["Render Main UI"]

    MAIN --> CP["ConfigProvider - antd Theme: Primary orange, Radius 8, Dark or Light, zh or en Locale"]
    CP --> AA["AntApp Wrapper"]
    AA --> ROUTER[HashRouter]
    ROUTER --> SUSPENSE["Suspense - Spin fallback for lazy loaded routes"]
    SUSPENSE --> LAYOUT["Layout Shell"]
    LAYOUT --> OUTLET["Outlet Renders Sub-route"]
    
    MAIN --> CLOSE_DIALOG["CloseDialog - Hide to Tray / Quit options"]
```

**为什么用 HashRouter 而不是 BrowserRouter？** Tauri 生产环境使用的是 `file://` 协议加载前端资源，`BrowserRouter` 依赖 History API，在 `file://` 下路由刷新会 404。`HashRouter` 把所有路由放在 `#` 之后，不触发文件请求，在 Tauri 中开箱即用。

**懒加载与代码分割：** 三个路由页面（`KanbanBoard`、`StatisticsPage`、`SettingsPage`）通过 `React.lazy()` 动态导入，根据路由按需加载。Vite 配置了 `manualChunks` 将依赖拆分为独立 chunk（react-vendor、antd、dnd-kit、recharts、i18n、tauri），首屏只加载必需的代码，后续路由在 `<Suspense fallback={<Spin />}>` 中显示加载指示器。

**关闭窗口行为：** 当用户点击窗口关闭按钮时，`onCloseRequested` 事件被拦截。根据 `localStorage` 中存储的 `close-behavior` 偏好：
- **`hide`**：窗口隐藏到系统托盘（Rust 侧已建立托盘图标）
- **`quit`**：调用 Rust `exit_app` 指令退出
- **未设置**：弹出 `CloseDialog` 对话框，用户选择"隐藏到托盘"或"退出"，可勾选"记住我的选择"
- 托盘右键菜单提供"Show Window"和"Quit"选项；左键单击直接显示窗口

**三条路由（均嵌套在 Layout 内）：**

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | KanbanBoard | 看板主视图，默认页 |
| `/statistics` | StatisticsPage | 统计图表 |
| `/settings` | SettingsPage | PIN 修改 / 主题 / 语言 |
| `*` | → 重定向至 `/` | 兜底 |

### 8.3 三个 Zustand Store 的职责与通信方式

```mermaid
graph TB
    subgraph "useAuthStore - Comm: invoke to Rust Commands"
        AS_S["State: isLocked, isFirstRun"]
        AS_A["Actions: unlock, setPin, changePin, lock, checkPinStatus"]
        AS_A -->|invoke| TCMD["Rust tauri command"]
    end

    subgraph "useTaskStore - Comm: Read / Write Split"
        TS_S["State: tasks, categories, tags, loading - searchQuery, filterCategory, filterPriority"]
        TS_R["Read: loadTasks, loadCategories, loadTags"]
        TS_W["Write: createTask, updateTask, deleteTask - moveTask, createCategory, deleteCategory - createTag, deleteTag, setTaskTags - addSubtask, toggleSubtask, deleteSubtask"]
        TS_R -->|db.select| TSQL["tauri-plugin-sql - Read-Only"]
        TS_W -->|invoke| TCMD2["Rust tauri command - Write"]
    end

    subgraph "useSettingsStore - Comm: localStorage R/W"
        SS_S["State: theme, language"]
        SS_A["Actions: setTheme, setLanguage, initSettings"]
        SS_S --> LS[localStorage]
    end
```

**为什么两种通信方式并存？**

- **useAuthStore** → `invoke()`：PIN 认证是安全敏感操作。bcrypt 哈希在 Rust 侧计算、存储、比对，JS 永远拿不到哈希值。前端只能得到"对/错"的布尔结果。
- **useTaskStore** → 读写分离：读操作（SELECT）通过 `tauri-plugin-sql` 直接查询 SQLite，简洁高效。写操作（INSERT/UPDATE/DELETE）走 `invoke()` → Rust 指令，保证前端无法通过 `allow-execute` 越权操作数据库。Rust 侧使用 `rusqlite` 参数化查询，杜绝 SQL 注入。

### 8.4 useTaskStore 关键实现细节

**读写分离架构：**

- **读操作** — 3 个函数使用 `tauri-plugin-sql` 的 `db.select()` 直接查询：
  - `loadTasks()`：SELECT tasks，然后 N+1 富化（关联 categories / tags / subtasks）
  - `loadCategories()`：`SELECT * FROM categories ORDER BY sort_order`
  - `loadTags()`：`SELECT * FROM tags ORDER BY name`

- **写操作** — 13 个函数使用 `invoke()` 调用 Rust 指令：
  - 任务：`create_task` / `update_task` / `delete_task` / `move_task`
  - 分类：`create_category` / `update_category` / `delete_category`
  - 标签：`create_tag` / `delete_tag` / `set_task_tags`
  - 子任务：`add_subtask` / `toggle_subtask` / `delete_subtask`

**loadTasks 采用 N+1 查询模式：**

```
1. SELECT * FROM tasks ORDER BY sort_order         → 拿到所有任务
2. 对每个 task:
   a. SELECT * FROM categories WHERE id = ?        → 关联分类
   b. SELECT tag_id FROM task_tags WHERE task_id = ? → 查关联关系
   c. SELECT * FROM tags WHERE id IN (...)          → 查标签详情
   d. SELECT * FROM subtasks WHERE task_id = ?      → 查子任务
3. 组装为 TaskWithRelations
   （含 category_name, tags[], subtasks[], subtask_progress）
```

**Rust 侧 update_task 动态构建 SQL**——根据传入字段动态生成 UPDATE 语句（参数化查询，杜绝 SQL 注入）：

```rust
// 前端传入 {title: "新标题", priority: "high"}
// Rust 侧通过 field! 宏动态拼接：
// → UPDATE tasks SET title = $1, priority = $2, updated_at = datetime('now') WHERE id = $3
let mut sets: Vec<String> = Vec::new();
let mut values: Vec<Box<dyn ToSql>> = Vec::new();
field!(data.title, "title");      // 只有传了才拼入 SET
field!(data.priority, "priority");
```

**每次写操作后全量 reload**：`createTask`、`updateTask`、`deleteTask`、`moveTask` 等方法在 invoke 调用 Rust 指令后都调用 `get().loadTasks()` 重新加载全部任务并触发 UI 重渲染。这种"写后全量刷新"策略在数据量不大时是最简单的保一致性方案。

### 8.5 类型定义 (types/index.ts)

```typescript
// 核心联合类型
type Priority    = 'high' | 'medium' | 'low';
type TaskStatus  = 'todo'  | 'in_progress' | 'done';

// 数据库实体（与 SQLite 表一一对应）
interface Category  { id, name, color, sort_order }
interface Tag       { id, name, color }
interface Subtask   { id, task_id, title, is_completed, sort_order }
interface Task      { id, title, description, notes, category_id,
                      priority, status, due_date, is_pinned,
                      sort_order, created_at, updated_at }

// 前端富化类型（联表查询后的结果）
interface TaskWithRelations extends Task {
  category_name, category_color,     // 从 categories 表 join 的字段
  tags: Tag[],                       // 从 task_tags + tags 关联来的
  subtasks: Subtask[],               // 从 subtasks 表关联来的
  subtask_progress: { done, total }  // 前端计算的进度
}

// UI 专用
interface KanbanColumn { id, title, status }
```

### 8.6 国际化 (i18n)

- 框架：`i18next` + `react-i18next`
- 语言包：静态加载 `zh-CN.json` 和 `en.json`，各约 50 个翻译 key
- 语言检测：读 `localStorage` → 回退 `zh-CN`
- Ant Design locale 联动：选中文时传 `zhCN`，选英文时传 `enUS` 给 `ConfigProvider`

### 8.7 样式策略

- **Ant Design 5** 提供绝大部分组件样式
- 主题定制通过 `ConfigProvider` 的 `token`：主色 `#fa8c16`（橙色），圆角 `8px`
- 暗色模式：`theme.darkAlgorithm` / `theme.defaultAlgorithm` 切换
- 自定义布局：**inline style**，没有 CSS 文件、CSS Module 或 Tailwind

---

## 9. 数据库设计

### 9.1 ER 图

```mermaid
erDiagram
    pin {
        INTEGER id PK
        TEXT pin_hash "bcrypt hash"
        TEXT created_at
        TEXT updated_at
    }
    categories {
        INTEGER id PK
        TEXT name
        TEXT color "hex color default fa8c16"
        INTEGER sort_order "smaller value sorts first"
    }
    tags {
        INTEGER id PK
        TEXT name "unique"
        TEXT color "hex color"
    }
    tasks {
        INTEGER id PK
        TEXT title
        TEXT description
        TEXT notes
        INTEGER category_id FK
        TEXT priority "high or medium or low"
        TEXT status "todo or in_progress or done"
        TEXT due_date "nullable"
        INTEGER is_pinned "0 or 1"
        INTEGER sort_order "column sort order"
        TEXT created_at
        TEXT updated_at
    }
    subtasks {
        INTEGER id PK
        INTEGER task_id FK "ON DELETE CASCADE"
        TEXT title
        INTEGER is_completed "0 or 1"
        INTEGER sort_order
    }
    task_tags {
        INTEGER task_id PK,FK "ON DELETE CASCADE"
        INTEGER tag_id PK,FK "ON DELETE CASCADE"
    }
    notifications {
        INTEGER id PK
        INTEGER task_id FK "ON DELETE CASCADE"
        TEXT notify_at
        INTEGER is_fired "0 or 1"
    }
    tasks ||--o{ subtasks : "contains"
    tasks }o--|| categories : "belongs to"
    tasks ||--o{ task_tags : "relates"
    tags ||--o{ task_tags : "related by"
    tasks ||--o{ notifications : "triggers"
```


### 9.2 完整建表 SQL

```sql
-- PIN 码存储（单例表：始终只有 0 或 1 行）
CREATE TABLE IF NOT EXISTS pin (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    pin_hash   TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 任务分类
CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT '#fa8c16',
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- 标签（名称唯一）
CREATE TABLE IF NOT EXISTS tags (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#fa8c16'
);

-- 核心任务表
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

-- 子任务
CREATE TABLE IF NOT EXISTS subtasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id      INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    sort_order   INTEGER NOT NULL DEFAULT 0
);

-- 任务-标签 多对多关联
CREATE TABLE IF NOT EXISTS task_tags (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

-- 通知提醒（已建表，前端功能尚未接入）
CREATE TABLE IF NOT EXISTS notifications (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id   INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    notify_at TEXT NOT NULL,
    is_fired  INTEGER NOT NULL DEFAULT 0
);
```

### 9.3 种子数据

仅在 `categories` 表为空时插入：

```sql
INSERT INTO categories (name, color, sort_order) VALUES
    ('工作', '#f5222d', 0),   -- 红色
    ('个人', '#fa8c16', 1),   -- 橙色
    ('学习', '#1890ff', 2);   -- 蓝色
```

### 9.4 数据库配置要点

- **WAL 模式**（Write-Ahead Logging）：写操作不阻塞读操作。Rust 和前端各持有一个连接，WAL 保证它们并发访问不出问题。
- **外键约束开启**：`ON DELETE CASCADE` 确保删除任务时自动清理子任务、标签关联、通知。

---

## 10. 数据流

### 10.1 任务创建 → 入库 → UI 刷新

```mermaid
sequenceDiagram
    participant UI as React Component
    participant STORE as useTaskStore
    participant INVOKE as invoke IPC
    participant RUST as Rust commands.rs
    participant RU_DB as rusqlite Connection
    participant FE_DB as Frontend DB Conn - tauri-plugin-sql readonly
    participant SQLITE as taskmanager.db

    UI->>STORE: createTask with data
    STORE->>INVOKE: invoke create_task with data
    INVOKE->>RUST: cross-process IPC call
    RUST->>RU_DB: lock execute INSERT INTO tasks
    RU_DB->>SQLITE: write to disk
    RU_DB-->>RUST: lastInsertId
    RUST-->>INVOKE: Result i64
    INVOKE-->>STORE: id number
    STORE->>STORE: loadTasks reload all
    STORE->>FE_DB: SELECT FROM tasks
    STORE->>FE_DB: per task JOIN categories tags subtasks
    STORE->>STORE: set tasks enriched
    STORE-->>UI: trigger React re-render
```

### 10.2 拖拽排序 → 入库 → 重排

```mermaid
sequenceDiagram
    participant DND as @dnd-kit
    participant BOARD as KanbanBoard
    participant STORE as useTaskStore
    participant INVOKE as invoke IPC
    participant RUST as Rust commands.rs

    DND->>BOARD: onDragEnd
    BOARD->>BOARD: calc new status and sort_order
    BOARD->>STORE: moveTask
    STORE->>INVOKE: invoke move_task with data
    INVOKE->>RUST: cross-process IPC call
    RUST->>RUST: execute UPDATE tasks
    RUST-->>INVOKE: Result
    INVOKE-->>STORE: ok
    STORE->>STORE: loadTasks reload
    STORE-->>BOARD: trigger re-render, card moves
```

### 10.3 PIN 验证（安全敏感路径）

```mermaid
sequenceDiagram
    participant UI as UnlockPage
    participant STORE as useAuthStore
    participant INVOKE as invoke IPC
    participant RUST as Rust lib.rs
    participant DB as rusqlite Connection

    UI->>STORE: unlock with pin
    STORE->>INVOKE: invoke verify_pin
    INVOKE->>RUST: cross-process IPC call
    RUST->>DB: lock query_row SELECT pin_hash
    DB-->>RUST: Option hash
    RUST->>RUST: bcrypt verify pin hash
    RUST-->>INVOKE: Result bool
    INVOKE-->>STORE: ok boolean
    STORE->>STORE: set isLocked false
    STORE-->>UI: navigate to main UI
```

---

## 11. 组件树与路由

### 11.1 完整组件树

```
<App>
  └─ <AppInner>
       ├─ (dbReady=false) → <Spin />                          # 数据库连接中
       ├─ (isLocked=true)  → <ConfigProvider>                  # antd 主题 + locale
       │                      └─ <UnlockPage>                  # 锁屏状态
       │                         └─ <PinInput />               # 4-6 位数字输入
       └─ (isLocked=false) → <ConfigProvider>                  # antd 主题 + locale
                               ├─ <HashRouter>
                               │    └─ <Routes>
                               │         ├─ <Layout>          # 布局壳
                               │         │   ├─ <TopNav />    # 顶部导航
                               │         │   └─ <Suspense fallback=<Spin />>
                               │         │        ├─ "/" →
                               │         │        │   <KanbanBoard> (lazy)
                               │         │        │     ├─ 搜索/筛选栏
                               │         │        │     ├─ <DndContext>
                               │         │        │     │   ├─ <KanbanColumn status="todo">
                               │         │        │     │   │   ├─ <TaskCard /> × N
                               │         │        │     │   │   └─ 添加任务输入框
                               │         │        │     │   ├─ <KanbanColumn status="in_progress">
                               │         │        │     │   ├─ <KanbanColumn status="done">
                               │         │        │     │   └─ <DragOverlay /> (拖拽浮动卡片)
                               │         │        │     └─ <TaskDrawer /> (右侧抽屉)
                               │         │        │
                               │         │        ├─ "/statistics" →
                               │         │        │   <StatisticsPage> (lazy)
                               │         │        │     ├─ 统计卡片 × 4
                               │         │        │     ├─ <PieChart /> × 2
                               │         │        │     └─ <BarChart />
                               │         │        │
                               │         │        └─ "/settings" →
                               │         │            <SettingsPage> (lazy)
                               │         │              ├─ 修改 PIN 卡片
                               │         │              ├─ 语言切换 (Radio)
                               │         │              ├─ 主题切换 (Radio)
                               │         │              └─ 锁定按钮
                               │         │
                               │         └─ "*" → <Navigate to="/" />
                               │
                               └─ <CloseDialog />             # 关闭选项对话框
```

### 11.2 看板拖拽架构

```mermaid
graph TB
    DND["DndContext - Drag Context - onDragEnd handler"]
    OVERLAY["DragOverlay - Semi-transparent floating card - while dragging"]

    COL1[KanbanColumn - status=todo - useDroppable]
    COL2[KanbanColumn - status=in_progress - useDroppable]
    COL3[KanbanColumn - status=done - useDroppable]

    SC1["SortableContext - items=todo task ID array"]
    SC2["SortableContext - items=in-progress task ID array"]
    SC3["SortableContext - items=done task ID array"]

    C1[TaskCard x N - useSortable]
    C2[TaskCard x N - useSortable]
    C3[TaskCard x N - useSortable]

    DND --> COL1
    DND --> COL2
    DND --> COL3
    DND --> OVERLAY

    COL1 --> SC1
    COL2 --> SC2
    COL3 --> SC3

    SC1 --> C1
    SC2 --> C2
    SC3 --> C3
```

**@dnd-kit 关键配置：**
- **传感器**：`PointerSensor`，激活距离 `5px`。意味着鼠标按下后需要移动 5px 才算开始拖拽，防止误触
- **跨列拖拽**：`onDragEnd` 中判断 `over` 的容器 id，更新 `status` + 批量重算 `sort_order`
- **同列排序**：仅更新涉及卡片的 `sort_order`

---

## 12. 构建流水线

```mermaid
flowchart LR
    subgraph "Dev Mode - cargo tauri dev"
        DEV1[bun run dev] --> VITE["Vite Dev Server - localhost:1420 - HMR Port: 1421"]
        VITE --> TDEV[cargo tauri dev]
        TDEV --> WV_DEV["Debug WebView - w/ DevTools"]
    end

    subgraph "Production Build - cargo tauri build"
        B1["tsc type check"] --> B2["vite build - output to dist/"]
        B2 --> B3["cargo tauri build - compile Rust + package"]
        B3 --> BIN["Platform Binary - .exe / .app / ELF"]
    end
```

### 12.1 tauri.conf.json 关键配置说明

```json
{
  "productName": "Task Manager",       // 应用显示名称
  "version": "0.1.0",                  // 应用版本
  "identifier": "com.taskmanager.app", // 唯一标识（用于数据目录、系统注册）
  "build": {
    "frontendDist": "../dist",         // 生产模式从这加载 HTML/JS/CSS
    "devUrl": "http://localhost:1420",  // 开发模式连到这个地址（Vite）
    "beforeDevCommand": "bun run dev", // tauri dev 启动前先执行
    "beforeBuildCommand": "bun run build" // tauri build 打包前先执行
  },
  "app": {
    "windows": [{
      "title": "Task Manager",
      "width": 1200,
      "height": 800,
      "minWidth": 900,
      "minHeight": 600,               // 防止窗口过小导致布局崩溃
      "resizable": true,
      "fullscreen": false
    }],
    "security": {
      "csp": null                     // 不启用 CSP（内联样式用得多）
    }
  }
}
```

### 12.2 npm 脚本

| 命令 | 作用 |
|------|------|
| `bun run dev` | 启动 Vite 开发服务器，支持 HMR |
| `bun run build` | 先 `tsc` 类型检查，再 `vite build` 打包 |
| `bun run preview` | 本地预览 Vite 构建产物（不通过 Tauri） |
| `bun run tauri` | 调用 Tauri CLI（开发/构建的入口） |

---

## 附录 A：关键文件清单

| 文件 | 行数 | 职责 |
|------|------|------|
| `src-tauri/src/main.rs` | 5 | Rust 二进制入口 |
| `src-tauri/src/lib.rs` | ~150 | Tauri 启动、21 个 invoke_handler、插件注册、系统托盘 |
| `src-tauri/src/commands.rs` | ~260 | 16 个写操作 Tauri 指令（CRUD：task/category/tag/subtask） |
| `src-tauri/src/db.rs` | ~104 | SQLite 连接、7 张表建表、种子数据 |
| `src-tauri/build.rs` | 3 | Tauri 构建脚本 |
| `src-tauri/Cargo.toml` | 22 | Rust 依赖声明 |
| `src-tauri/tauri.conf.json` | 28 | Tauri 窗口/构建配置 |
| `src-tauri/capabilities/default.json` | ~15 | 插件权限白名单（SELECT 只读） |
| `src/main.tsx` | 5 | React 挂载点 |
| `src/App.tsx` | ~130 | 根组件：条件渲染 + 路由 + 主题 + 关闭拦截 + tray 事件 |
| `src/types/index.ts` | 53 | 全部 TS 类型定义 |
| `src/db/database.ts` | 10 | SQLite 连接单例（plugin 只读） |
| `src/stores/useAuthStore.ts` | 40 | PIN 认证状态（invoke Rust 指令） |
| `src/stores/useTaskStore.ts` | ~210 | 任务 CRUD：读用 db.select / 写用 invoke() |
| `src/stores/useSettingsStore.ts` | ~60 | 设置偏好状态（localStorage） |
| `src/components/Layout.tsx` | ~30 | 布局壳 |
| `src/components/TopNav.tsx` | ~40 | 顶部导航栏 |
| `src/components/KanbanColumn.tsx` | ~130 | 看板列 |
| `src/components/TaskCard.tsx` | ~100 | 任务卡片 |
| `src/components/TaskDrawer.tsx` | ~160 | 任务编辑抽屉 |
| `src/components/CloseDialog.tsx` | 40 | 关闭选项对话框（隐藏到托盘 / 退出 + 记忆偏好） |
| `src/components/PinInput.tsx` | ~50 | PIN 输入控件 |
| `src/routes/UnlockPage.tsx` | ~70 | 解锁页 |
| `src/routes/KanbanBoard.tsx` | ~180 | 看板主页（拖拽容器） |
| `src/routes/StatisticsPage.tsx` | ~140 | 统计仪表盘 |
| `src/routes/SettingsPage.tsx` | ~120 | 设置页 |
| `src/i18n/zh-CN.json` | ~50 | 中文翻译 |
| `src/i18n/en.json` | ~50 | 英文翻译 |

## 附录 B：已完成功能清单

| 功能模块 | 功能点 |
|----------|--------|
| **PIN 安全** | 首次设置 PIN、启动解锁、修改 PIN、bcrypt 哈希存储 |
| **看板管理** | 三列看板（待办/进行中/已完成）、添加/重命名/删除列 |
| **任务 CRUD** | 创建、编辑（标题/描述/备注/优先级/分类/截止日期/标签）、删除 |
| **拖拽排序** | @dnd-kit 跨列拖拽、同列排序、Pointer 传感器 5px 防误触 |
| **子任务** | 添加检查项、勾选/取消完成、删除、进度条 |
| **标签系统** | 创建/删除标签、多对多关联、颜色标识 |
| **分类系统** | 3 个默认分类（工作/个人/学习）、自定义颜色 |
| **搜索筛选** | 标题模糊搜索、按分类筛选、按优先级筛选 |
| **统计仪表盘** | 总览卡片（总数/已完成/完成率/逾期）、饼图、柱状图、7/30 天切换 |
| **国际化** | 中文/英文切换，Ant Design locale 联动 |
| **主题** | 亮色/暗色/跟随系统，Ant Design theme algorithm |
| **数据持久化** | SQLite WAL 模式、localStorage 偏好存储 |
| **系统托盘** | 关闭最小化到托盘、托盘右键菜单（显示/退出）、左键恢复窗口 |
| **关闭选项** | 关闭对话框（隐藏到托盘/退出）、记忆用户选择（localStorage） |
| **性能优化** | React.lazy 路由懒加载、Vite manualChunks 代码分割 |
