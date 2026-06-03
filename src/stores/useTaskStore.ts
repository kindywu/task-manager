import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { getDb } from '../db/database';
import type {
  TaskWithRelations,
  Task,
  Category,
  Tag,
  Subtask,
  Priority,
  TaskStatus,
} from '../types';

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

  createCategory: (name: string, color: string) => Promise<void>;
  updateCategory: (id: number, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;

  createTag: (name: string, color: string) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;
  setTaskTags: (taskId: number, tagIds: number[]) => Promise<void>;

  addSubtask: (taskId: number, title: string) => Promise<void>;
  toggleSubtask: (id: number, isCompleted: boolean) => Promise<void>;
  deleteSubtask: (id: number) => Promise<void>;

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

  // ── Reads via tauri-plugin-sql ──────────────────────────

  loadTasks: async () => {
    const db = await getDb();
    set({ loading: true });
    const tasks = await db.select<Task[]>(
      'SELECT * FROM tasks ORDER BY sort_order ASC'
    );
    const enriched: TaskWithRelations[] = [];
    for (const t of tasks) {
      const cat = await db.select<Category[]>(
        'SELECT * FROM categories WHERE id = $1',
        [t.category_id]
      );
      const tagRows = await db.select<{ tag_id: number }[]>(
        'SELECT tag_id FROM task_tags WHERE task_id = $1',
        [t.id]
      );
      let tags: Tag[] = [];
      if (tagRows.length > 0) {
        const ids = tagRows.map((r) => r.tag_id);
        const ph = ids.map((_, i) => `$${i + 1}`).join(',');
        tags = await db.select<Tag[]>(
          `SELECT * FROM tags WHERE id IN (${ph})`,
          ids
        );
      }
      const subtasks = await db.select<Subtask[]>(
        'SELECT * FROM subtasks WHERE task_id = $1 ORDER BY sort_order ASC',
        [t.id]
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

  // ── Writes via Rust invoke() ────────────────────────────

  createTask: async (data) => {
    const id = await invoke<number>('create_task', { data });
    await get().loadTasks();
    return id;
  },

  updateTask: async (id, data) => {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        clean[k] = v;
      }
    }
    if (Object.keys(clean).length === 0) return;
    await invoke('update_task', { id, data: clean });
    await get().loadTasks();
  },

  deleteTask: async (id) => {
    await invoke('delete_task', { id });
    await get().loadTasks();
  },

  moveTask: async (id, status, sortOrder) => {
    await invoke('move_task', { id, status, sortOrder });
    await get().loadTasks();
  },

  createCategory: async (name, color) => {
    await invoke('create_category', { name, color });
    await get().loadCategories();
  },

  updateCategory: async (id, data) => {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        clean[k] = v;
      }
    }
    if (Object.keys(clean).length === 0) return;
    await invoke('update_category', { id, data: clean });
    await get().loadCategories();
  },

  deleteCategory: async (id) => {
    await invoke('delete_category', { id });
    await get().loadCategories();
  },

  createTag: async (name, color) => {
    await invoke('create_tag', { name, color });
    await get().loadTags();
  },

  deleteTag: async (id) => {
    await invoke('delete_tag', { id });
    await get().loadTags();
  },

  setTaskTags: async (taskId, tagIds) => {
    await invoke('set_task_tags', { taskId, tagIds });
    await get().loadTasks();
  },

  addSubtask: async (taskId, title) => {
    await invoke('add_subtask', { taskId, title });
    await get().loadTasks();
  },

  toggleSubtask: async (id, isCompleted) => {
    await invoke('toggle_subtask', { id, isCompleted });
    await get().loadTasks();
  },

  deleteSubtask: async (id) => {
    await invoke('delete_subtask', { id });
    await get().loadTasks();
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setFilterCategory: (id) => set({ filterCategory: id }),
  setFilterPriority: (p) => set({ filterPriority: p }),
}));
