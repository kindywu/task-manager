import { Card, Tag, Typography } from 'antd';
import { ClockCircleOutlined, PushpinOutlined } from '@ant-design/icons';
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

  const isOverdue =
    task.due_date &&
    dayjs(task.due_date).isBefore(dayjs(), 'day') &&
    task.status !== 'done';

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
              {task.is_pinned && (
                <PushpinOutlined style={{ color: '#fa8c16', marginRight: 4 }} />
              )}
              {task.title}
            </Paragraph>
          </div>
        </div>

        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {task.tags.map((tag) => (
            <Tag key={tag.id} color={tag.color} style={{ margin: 0, fontSize: 11 }}>
              {tag.name}
            </Tag>
          ))}
        </div>

        <div
          style={{
            marginTop: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
          }}
        >
          <span>
            {task.due_date && (
              <Text type={isOverdue ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                <ClockCircleOutlined style={{ marginRight: 2 }} />
                {isOverdue ? '已过期' : dayjs(task.due_date).format('MM-DD')}
              </Text>
            )}
          </span>
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
