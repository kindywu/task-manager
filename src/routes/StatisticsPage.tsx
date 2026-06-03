import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Typography, Segmented } from 'antd';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useTaskStore } from '../stores/useTaskStore';
import dayjs from 'dayjs';

const { Title } = Typography;

const COLORS = ['#f5222d', '#fa8c16', '#1890ff', '#52c41a', '#722ed1', '#eb2f96'];

export default function StatisticsPage() {
  const { t } = useTranslation();
  const { tasks, loadTasks } = useTaskStore();
  const [period, setPeriod] = useState<string>('week');

  useEffect(() => {
    loadTasks();
  }, []);

  const now = dayjs();
  const periodDays = period === 'week' ? 7 : 30;

  const completed = tasks.filter((t) => t.status === 'done').length;
  const total = tasks.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const overdue = tasks.filter(
    (t) => t.due_date && dayjs(t.due_date).isBefore(now, 'day') && t.status !== 'done'
  ).length;

  const catMap: Record<string, number> = {};
  tasks.forEach((t) => {
    catMap[t.category_name] = (catMap[t.category_name] || 0) + 1;
  });
  const catData = Object.entries(catMap).map(([name, value]) => ({ name, value }));

  const priMap: Record<string, number> = { high: 0, medium: 0, low: 0 };
  tasks.forEach((t) => {
    priMap[t.priority]++;
  });
  const priData = Object.entries(priMap).map(([name, value]) => ({
    name:
      name === 'high'
        ? t('task.high')
        : name === 'medium'
          ? t('task.medium')
          : t('task.low'),
    value,
  }));

  const trendData: { date: string; created: number; completed: number }[] = [];
  for (let i = periodDays - 1; i >= 0; i--) {
    const date = now.subtract(i, 'day').format('MM-DD');
    const dayStr = now.subtract(i, 'day').format('YYYY-MM-DD');
    trendData.push({
      date,
      created: tasks.filter((t) => t.created_at.startsWith(dayStr)).length,
      completed: tasks.filter(
        (t) => t.status === 'done' && t.updated_at.startsWith(dayStr)
      ).length,
    });
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        {t('app.statistics')}
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('statistics.total')}
              value={total}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('statistics.completed')}
              value={completed}
              suffix={`/ ${total}`}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('statistics.completionRate')}
              value={completionRate}
              suffix="%"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('task.overdue')}
              value={overdue}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title={t('statistics.categoryDistribution')}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={catData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {catData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t('statistics.priorityBreakdown')}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={priData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {priData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card
        title={t('statistics.trend')}
        extra={
          <Segmented
            value={period}
            onChange={(v) => setPeriod(v as string)}
            options={[
              { value: 'week', label: t('statistics.last7Days') },
              { value: 'month', label: t('statistics.last30Days') },
            ]}
          />
        }
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="created"
              name={t('statistics.tasksCreated')}
              fill="#fa8c16"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="completed"
              name={t('statistics.tasksCompleted')}
              fill="#52c41a"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
