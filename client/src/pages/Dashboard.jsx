import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CheckSquare, Clock, AlertTriangle, FolderKanban } from 'lucide-react';
import api from '../lib/api';

const STATUS_COLORS = ['#f59e0b', '#3b82f6', '#10b981'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/overview')
    ]).then(([statsRes, overviewRes]) => {
      setStats(statsRes.data);
      setOverview(overviewRes.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 h-24 bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  const pieData = stats ? [
    { name: 'To Do', value: stats.byStatus.todo },
    { name: 'In Progress', value: stats.byStatus.inProgress },
    { name: 'Done', value: stats.byStatus.done }
  ].filter(d => d.value > 0) : [];

  const barData = overview?.tasksPerUser?.map(t => ({
    name: t.user?.name?.split(' ')[0] || 'Unassigned',
    tasks: t.taskCount
  })) || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CheckSquare} label="Total Tasks" value={stats?.totalTasks || 0} color="text-brand-600" bg="bg-brand-50 dark:bg-brand-900/30" />
        <StatCard icon={Clock} label="In Progress" value={stats?.byStatus?.inProgress || 0} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/30" />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats?.overdueTasks || 0} color="text-red-600" bg="bg-red-50 dark:bg-red-900/30" />
        <StatCard icon={FolderKanban} label="Projects" value={stats?.totalProjects || 0} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-900/30" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pieData.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Tasks by Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={STATUS_COLORS[idx % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {barData.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Tasks per Member</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }} />
                <Bar dataKey="tasks" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Upcoming deadlines */}
      {overview?.upcomingDeadlines?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Upcoming Deadlines</h3>
          <div className="space-y-3">
            {overview.upcomingDeadlines.slice(0, 5).map(task => (
              <div key={task.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.project?.color || '#6366f1' }} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{task.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{task.project?.name}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {overview?.recentActivity?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {overview.recentActivity.slice(0, 8).map(activity => (
              <div key={activity.id} className="flex items-start gap-3 py-2">
                <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {activity.user?.name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{activity.user?.name}</span>{' '}
                    {activity.details}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatTimeAgo(activity.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg ${bg} ${color} flex items-center justify-center`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
