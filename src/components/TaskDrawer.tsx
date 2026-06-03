import { useState } from 'react';
import {
  Drawer, Input, Select, DatePicker, Radio, Button, Space, Checkbox,
  Typography, Popconfirm, Divider, List,
} from 'antd';
import { PlusOutlined, DeleteOutlined, CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import type { TaskWithRelations, Category, Tag as TagType } from '../types';

const { TextArea } = Input;
const { Text } = Typography;

interface Props {
  task: TaskWithRelations | null;
  categories: Category[];
  tags: TagType[];
  onClose: () => void;
  onUpdate: (id: number, data: Partial<TaskWithRelations>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onAddSubtask: (taskId: number, title: string) => Promise<void>;
  onToggleSubtask: (id: number, isCompleted: boolean) => Promise<void>;
  onDeleteSubtask: (id: number) => Promise<void>;
  onSetTags: (taskId: number, tagIds: number[]) => Promise<void>;
}

export default function TaskDrawer({
  task,
  categories,
  tags,
  onClose,
  onUpdate,
  onDelete,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onSetTags,
}: Props) {
  const { t } = useTranslation();
  const [newSubtask, setNewSubtask] = useState('');

  if (!task) return null;

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      onAddSubtask(task.id, newSubtask.trim());
      setNewSubtask('');
    }
  };

  const selectedTagIds = task.tags.map((tg) => tg.id);

  return (
    <Drawer
      open={!!task}
      onClose={onClose}
      width={480}
      title={
        <Input
          variant="borderless"
          value={task.title}
          onChange={(e) => onUpdate(task.id, { title: e.target.value })}
          style={{ fontSize: 18, fontWeight: 600, padding: 0 }}
        />
      }
      extra={
        <Popconfirm
          title={t('task.deleteConfirm')}
          onConfirm={() => onDelete(task.id)}
          okText={t('common.confirm')}
          cancelText={t('common.cancel')}
        >
          <Button danger icon={<DeleteOutlined />} />
        </Popconfirm>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Text type="secondary">{t('task.priority')}</Text>
          <Radio.Group
            value={task.priority}
            onChange={(e) => onUpdate(task.id, { priority: e.target.value })}
            style={{ marginLeft: 16 }}
          >
            <Radio.Button value="high" style={{ color: '#f5222d' }}>
              {t('task.high')}
            </Radio.Button>
            <Radio.Button value="medium" style={{ color: '#fa8c16' }}>
              {t('task.medium')}
            </Radio.Button>
            <Radio.Button value="low">{t('task.low')}</Radio.Button>
          </Radio.Group>
        </div>

        <div>
          <Text type="secondary">{t('task.category')}</Text>
          <Select
            value={task.category_id}
            onChange={(v) => onUpdate(task.id, { category_id: v })}
            style={{ width: '100%', marginTop: 4 }}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>

        <div>
          <Text type="secondary">{t('task.dueDate')}</Text>
          <DatePicker
            value={task.due_date ? dayjs(task.due_date) : null}
            onChange={(d) =>
              onUpdate(task.id, {
                due_date: d?.format('YYYY-MM-DD') || undefined,
              } as Partial<TaskWithRelations>)
            }
            style={{ width: '100%', marginTop: 4 }}
            allowClear
          />
        </div>

        <div>
          <Text type="secondary">{t('task.tags')}</Text>
          <Select
            mode="multiple"
            value={selectedTagIds}
            onChange={(ids) => onSetTags(task.id, ids)}
            style={{ width: '100%', marginTop: 4 }}
            options={tags.map((tg) => ({ value: tg.id, label: tg.name }))}
            placeholder="选择标签"
          />
        </div>

        <div>
          <Text type="secondary">{t('task.description')}</Text>
          <TextArea
            value={task.description}
            onChange={(e) => onUpdate(task.id, { description: e.target.value })}
            placeholder="添加描述..."
            rows={3}
            style={{ marginTop: 4 }}
          />
        </div>

        <div>
          <Text type="secondary">{t('task.notes')}</Text>
          <TextArea
            value={task.notes}
            onChange={(e) => onUpdate(task.id, { notes: e.target.value })}
            placeholder="添加备注..."
            rows={4}
            style={{ marginTop: 4 }}
          />
        </div>

        <Divider />

        <div>
          <Text strong>{t('task.subtasks')}</Text>
          {task.subtasks.length > 0 && (
            <List
              size="small"
              dataSource={task.subtasks}
              renderItem={(st) => (
                <List.Item
                  actions={[
                    <Button
                      key="del"
                      type="text"
                      size="small"
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => onDeleteSubtask(st.id)}
                    />,
                  ]}
                >
                  <Checkbox
                    checked={st.is_completed}
                    onChange={(e) => onToggleSubtask(st.id, e.target.checked)}
                  >
                    <Text delete={st.is_completed} style={{ fontSize: 14 }}>
                      {st.title}
                    </Text>
                  </Checkbox>
                </List.Item>
              )}
              style={{ marginTop: 8 }}
            />
          )}
          <Space.Compact style={{ width: '100%', marginTop: 8 }}>
            <Input
              placeholder={t('task.addSubtask')}
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onPressEnter={handleAddSubtask}
            />
            <Button icon={<PlusOutlined />} onClick={handleAddSubtask} />
          </Space.Compact>
        </div>
      </Space>
    </Drawer>
  );
}
