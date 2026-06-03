import { useState } from 'react';
import { Button, Input, Space, Typography, Badge } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { TaskWithRelations } from '../types';
import TaskCard from './TaskCard';

const { Title } = Typography;

interface Props {
  column: { id: string; title: string; status: string };
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
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
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditName(column.title);
              setEditing(true);
            }}
          />
          {canDelete && (
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={onDeleteColumn}
            />
          )}
        </Space>
      </div>

      <div ref={setNodeRef} style={{ flex: 1, overflowY: 'auto', minHeight: 60 }}>
        <SortableContext
          items={tasks.map((t) => t.id.toString())}
          strategy={verticalListSortingStrategy}
        >
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
            onBlur={() => {
              if (!newTitle) setAdding(false);
            }}
            autoFocus
          />
        ) : (
          <Button block type="dashed" icon={<PlusOutlined />} onClick={() => setAdding(true)}>
            添加任务
          </Button>
        )}
      </div>
    </div>
  );
}
