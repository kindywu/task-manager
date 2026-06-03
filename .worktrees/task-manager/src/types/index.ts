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
