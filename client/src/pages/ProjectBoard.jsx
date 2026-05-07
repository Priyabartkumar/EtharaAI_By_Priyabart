import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, Calendar, Users, ArrowLeft, Trash2, UserPlus, Pencil, X, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';

const COLUMNS = [
  { id: 'TODO', label: 'To Do', color: 'bg-amber-400' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-400' },
  { id: 'DONE', label: 'Done', color: 'bg-emerald-400' }
];

const PRIORITY_STYLES = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-50 text-blue-700',
  HIGH: 'bg-orange-50 text-orange-700',
  URGENT: 'bg-red-50 text-red-700'
};

export default function ProjectBoard() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  async function fetchProject() {
    try {
      const { data } = await api.get(`/projects/${projectId}`);
      setProject(data.project);
      const membership = data.project.members.find(m => m.user.id === user.id);
      setUserRole(membership?.role || null);
    } catch (err) {
      toast.error('Failed to load project');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(taskId, newStatus) {
    try {
      await api.put(`/tasks/${projectId}/${taskId}`, { status: newStatus });
      setProject(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
      }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update task');
    }
  }

  async function handleCreateTask(taskData) {
    try {
      const { data } = await api.post(`/tasks/${projectId}`, taskData);
      setProject(prev => ({ ...prev, tasks: [...prev.tasks, data.task] }));
      setShowCreateTask(null);
      toast.success('Task created');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create task');
    }
  }

  async function handleDeleteTask(taskId) {
    try {
      await api.delete(`/tasks/${projectId}/${taskId}`);
      setProject(prev => ({
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== taskId)
      }));
      toast.success('Task deleted');
    } catch (err) {
      toast.error('Failed to delete task');
    }
  }

  async function handleAddMember(email) {
    try {
      const { data } = await api.post(`/projects/${projectId}/members`, { email });
      setProject(prev => ({
        ...prev,
        members: [...prev.members, data.member]
      }));
      setShowAddMember(false);
      toast.success('Member added');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    }
  }

  async function handleUpdateTask(taskId, updates) {
    try {
      const { data } = await api.put(`/tasks/${projectId}/${taskId}`, updates);
      setProject(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? data.task : t)
      }));
      setEditingTask(null);
      toast.success('Task updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update task');
    }
  }

  if (loading) {
    return <div className="animate-pulse card h-96 bg-gray-100" />;
  }

  if (!project) return null;

  const isAdmin = userRole === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/projects')} className="p-1 hover:bg-gray-100 rounded">
            <ArrowLeft size={20} />
          </button>
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Member avatars */}
          <div className="flex -space-x-2 mr-2">
            {project.members.slice(0, 5).map(m => (
              <div
                key={m.id}
                className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 border-2 border-white flex items-center justify-center text-xs font-semibold"
                title={m.user.name}
              >
                {m.user.name.charAt(0)}
              </div>
            ))}
          </div>
          {isAdmin && (
            <button onClick={() => setShowAddMember(true)} className="btn-secondary flex items-center gap-1 text-sm py-1.5">
              <UserPlus size={14} />
              Add
            </button>
          )}
        </div>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map(column => {
          const columnTasks = project.tasks.filter(t => t.status === column.id);
          return (
            <div key={column.id} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
                  <h3 className="font-medium text-sm text-gray-700">{column.label}</h3>
                  <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setShowCreateTask(column.id)}
                    className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>

              <div className="space-y-2 min-h-[200px]">
                {columnTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isAdmin={isAdmin}
                    currentUserId={user.id}
                    columns={COLUMNS}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteTask}
                    onEdit={setEditingTask}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Discussion section */}
      <DiscussionSection projectId={projectId} currentUser={user} />

      {/* Create task modal */}
      {showCreateTask && (
        <CreateTaskModal
          status={showCreateTask}
          members={project.members}
          onClose={() => setShowCreateTask(null)}
          onCreate={handleCreateTask}
        />
      )}

      {/* Add member modal */}
      {showAddMember && (
        <AddMemberModal
          onClose={() => setShowAddMember(false)}
          onAdd={handleAddMember}
          existingMembers={project.members}
        />
      )}

      {/* Edit task modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          members={project.members}
          isAdmin={isAdmin}
          onClose={() => setEditingTask(null)}
          onUpdate={handleUpdateTask}
        />
      )}
    </div>
  );
}

function TaskCard({ task, isAdmin, currentUserId, columns, onStatusChange, onDelete, onEdit }) {
  const [showMenu, setShowMenu] = useState(false);
  const isAssignedToMe = task.assigneeId === currentUserId;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

  return (
    <div
      className={`card p-3 group ${isAdmin ? 'cursor-pointer hover:shadow-sm' : ''} transition-shadow`}
      onClick={() => isAdmin && onEdit(task)}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-gray-900 flex-1">{task.title}</h4>
        {(isAdmin || isAssignedToMe) && (
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-opacity"
            >
              <MoreHorizontal size={14} className="text-gray-400" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 w-40">
                {isAdmin && (
                  <>
                    <button
                      onClick={() => { onEdit(task); setShowMenu(false); }}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Pencil size={12} />
                      Edit / Assign
                    </button>
                    <hr className="my-1" />
                  </>
                )}
                {!isAdmin && isAssignedToMe && (
                  <p className="px-3 py-1 text-[10px] text-gray-400 uppercase font-semibold">Update Status</p>
                )}
                {columns.filter(c => c.id !== task.status).map(col => (
                  <button
                    key={col.id}
                    onClick={() => { onStatusChange(task.id, col.id); setShowMenu(false); }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <div className={`w-2 h-2 rounded-full ${col.color}`} />
                    {col.label}
                  </button>
                ))}
                {isAdmin && (
                  <>
                    <hr className="my-1" />
                    <button
                      onClick={() => { onDelete(task.id); setShowMenu(false); }}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[task.priority]}`}>
            {task.priority.toLowerCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              <Calendar size={10} />
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {task.assignee && (
            <div
              className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-semibold"
              title={task.assignee.name}
            >
              {task.assignee.name.charAt(0)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateTaskModal({ status, members, onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    api.get('/auth/users').then(res => setAllUsers(res.data)).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await onCreate({
      title,
      description: description || undefined,
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      assigneeId: assigneeId || null
    });
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Task</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="What needs to be done?"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field resize-none"
              rows={3}
              placeholder="Add more details..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="input-field"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="input-field"
            >
              <option value="">Unassigned</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}{u.role === 'ADMIN' ? ' (Admin)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading || !title.trim()} className="btn-primary">
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddMemberModal({ onClose, onAdd, existingMembers }) {
  const [search, setSearch] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/auth/users')
      .then(res => setAllUsers(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const existingIds = new Set(existingMembers.map(m => m.user.id));
  const filtered = allUsers.filter(u =>
    !existingIds.has(u.id) &&
    (u.name.toLowerCase().includes(search.toLowerCase()) ||
     u.email.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleAdd(email) {
    setAdding(true);
    await onAdd(email);
    setAdding(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Member</h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field mb-3"
          placeholder="Search by name or email..."
          autoFocus
        />
        <div className="max-h-60 overflow-y-auto space-y-1">
          {loading && <p className="text-sm text-gray-400 text-center py-4">Loading users...</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No users found</p>
          )}
          {filtered.map(user => (
            <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <button
                onClick={() => handleAdd(user.email)}
                disabled={adding}
                className="btn-primary text-xs px-3 py-1 shrink-0 ml-2"
              >
                Add
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}

function EditTaskModal({ task, members, isAdmin, onClose, onUpdate }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.split('T')[0] : '');
  const [assigneeId, setAssigneeId] = useState(task.assigneeId || '');
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    api.get('/auth/users').then(res => setAllUsers(res.data)).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await onUpdate(task.id, {
      title,
      description: description || undefined,
      priority,
      status,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      assigneeId: assigneeId || null
    });
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Edit Task</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field resize-none"
              rows={3}
              placeholder="Add more details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input-field"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="input-field"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="input-field"
              disabled={!isAdmin}
            >
              <option value="">Unassigned</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}{u.role === 'ADMIN' ? ' (Admin)' : ''}
                </option>
              ))}
            </select>
            {!isAdmin && (
              <p className="text-xs text-gray-400 mt-1">Only admins can reassign tasks</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading || !title.trim()} className="btn-primary">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DiscussionSection({ projectId, currentUser }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, projectId]);

  async function fetchComments() {
    try {
      const { data } = await api.get(`/projects/${projectId}/comments`);
      setComments(data.comments);
    } catch (err) {
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/comments`, { content: newComment });
      setComments(prev => [...prev, data.comment]);
      setNewComment('');
    } catch (err) {
      toast.error('Failed to send comment');
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(commentId) {
    try {
      await api.delete(`/projects/${projectId}/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  }

  return (
    <div className="card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-brand-600" />
          <h3 className="font-semibold text-gray-900">Discussion</h3>
          {comments.length > 0 && (
            <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">{comments.length}</span>
          )}
        </div>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen && (
        <div className="border-t border-gray-100">
          {/* Comments list */}
          <div className="max-h-80 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-24" />
                      <div className="h-3 bg-gray-200 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No comments yet. Start the discussion!</p>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="flex gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {comment.user?.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{comment.user?.name}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        comment.userRole === 'ADMIN' ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {comment.userRole}
                      </span>
                      <span className="text-xs text-gray-400">{formatCommentTime(comment.createdAt)}</span>
                      {comment.userId === currentUser.id && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded transition-opacity"
                        >
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="border-t border-gray-100 p-4 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="input-field flex-1"
              placeholder="Write a comment..."
            />
            <button
              type="submit"
              disabled={sending || !newComment.trim()}
              className="btn-primary px-3"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ isOpen }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function formatCommentTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
