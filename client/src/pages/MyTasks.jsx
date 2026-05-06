import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const STATUS_LABELS = {
  TODO: { label: 'To Do', style: 'bg-amber-100 text-amber-700' },
  IN_PROGRESS: { label: 'In Progress', style: 'bg-blue-100 text-blue-700' },
  DONE: { label: 'Done', style: 'bg-emerald-100 text-emerald-700' }
};

const PRIORITY_STYLES = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-50 text-blue-700',
  HIGH: 'bg-orange-50 text-orange-700',
  URGENT: 'bg-red-50 text-red-700'
};

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/tasks/my-tasks')
      .then(res => setTasks(res.data.tasks))
      .catch(() => toast.error('Failed to load tasks'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE');

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card h-16 animate-pulse bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>

      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-500" />
          <p className="text-sm text-red-700">
            You have <span className="font-semibold">{overdue.length}</span> overdue {overdue.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'all', label: 'All' },
          { key: 'TODO', label: 'To Do' },
          { key: 'IN_PROGRESS', label: 'In Progress' },
          { key: 'DONE', label: 'Done' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500">No tasks found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => {
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
            return (
              <Link
                key={task.id}
                to={`/projects/${task.project.id}`}
                className="card p-4 flex items-center justify-between hover:shadow-sm transition-shadow block"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: task.project?.color || '#6366f1' }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    <p className="text-xs text-gray-400">{task.project?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[task.priority]}`}>
                    {task.priority.toLowerCase()}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[task.status].style}`}>
                    {STATUS_LABELS[task.status].label}
                  </span>
                  {task.dueDate && (
                    <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                      <Calendar size={10} />
                      {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
