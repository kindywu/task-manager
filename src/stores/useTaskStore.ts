import { create } from 'zustand';
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
    const keys = Object.keys(data).filter(
      (k) => data[k as keyof Task] !== undefined
    );
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
      "UPDATE tasks SET status = $1, sort_order = $2, updated_at = datetime('now') WHERE id = $3",
      [status, sortOrder, id]
    );
    await get().loadTasks();
  },

  createCategory: async (name, color) => {
    const db = await getDb();
    await db.execute('INSERT INTO categories (name, color) VALUES ($1, $2)', [
      name,
      color,
    ]);
    await get().loadCategories();
  },

  updateCategory: async (id, data) => {
    const db = await getDb();
    const keys = Object.keys(data).filter(
      (k) => data[k as keyof Category] !== undefined
    );
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
    await db.execute('INSERT INTO tags (name, color) VALUES ($1, $2)', [
      name,
      color,
    ]);
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
