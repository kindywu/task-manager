import { useState, useEffect, useMemo } from 'react';
import { Button, Input, Select, Space } from 'antd';
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
import type { TaskWithRelations, TaskStatus } from '../types';

const DEFAULT_COLUMNS = [
  { id: 'todo', title: '待办', status: 'todo' as TaskStatus },
  { id: 'in_progress', title: '进行中', status: 'in_progress' as TaskStatus },
  { id: 'done', title: '已完成', status: 'done' as TaskStatus },
];

export default function KanbanBoard() {
  const { t } = useTranslation();
  const {
    tasks, categories, tags,
    loadTasks, loadCategories, loadTags,
    createTask, moveTask, updateTask, deleteTask,
    addSubtask, toggleSubtask, deleteSubtask, setTaskTags,
    searchQuery, setSearchQuery,
    filterCategory, setFilterCategory,
    filterPriority, setFilterPriority,
  } = useTaskStore();

  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);
  const [drawerTask, setDrawerTask] = useState<TaskWithRelations | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColName, setNewColName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

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
        (t) =>
          t.title.toLowerCase().includes(q) ||
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
    filteredTasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.sort_order - b.sort_order);

  const handleDragStart = (event: DragStartEvent) => {
    const t = tasks.find((tk) => tk.id.toString() === event.active.id);
    if (t) setActiveTask(t);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = parseInt(active.id.toString());

    const overCol = columns.find((c) => c.id === over.id);
    if (overCol) {
      const colTasks = getTasksByStatus(overCol.status);
      moveTask(taskId, overCol.status, colTasks.length);
      return;
    }

    const overTask = tasks.find((tk) => tk.id.toString() === over.id);
    if (overTask) {
      const task = tasks.find((tk) => tk.id === taskId);
      if (task) {
        const colTasks = getTasksByStatus(overTask.status);
        moveTask(taskId, overTask.status, overTask.sort_order);
      }
    }
  };

  const handleAddTask = async (status: TaskStatus, title: string) => {
    const colTasks = getTasksByStatus(status);
    await createTask({
      title,
      category_id: categories[0]?.id || 1,
      status,
      sort_order: colTasks.length,
    });
  };

  const handleAddColumn = () => {
    if (!newColName.trim()) return;
    const id = `col_${Date.now()}`;
    setColumns([
      ...columns,
      { id, title: newColName.trim(), status: id as TaskStatus },
    ]);
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          style={{
            display: 'flex',
            gap: 16,
            overflowX: 'auto',
            paddingBottom: 16,
          }}
        >
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
            <div
              style={{
                width: 320,
                minWidth: 320,
                padding: 12,
                background: '#fafafa',
                borderRadius: 8,
              }}
            >
              <Input
                placeholder="列名称..."
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onPressEnter={handleAddColumn}
                onBlur={() => {
                  if (!newColName) setAddingColumn(false);
                }}
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
        onUpdate={async (id, data) => {
          await updateTask(id, data as Partial<TaskWithRelations>);
        }}
        onDelete={async (id) => {
          await deleteTask(id);
          setDrawerTask(null);
        }}
        onAddSubtask={addSubtask}
        onToggleSubtask={toggleSubtask}
        onDeleteSubtask={deleteSubtask}
        onSetTags={setTaskTags}
      />
    </div>
  );
}
