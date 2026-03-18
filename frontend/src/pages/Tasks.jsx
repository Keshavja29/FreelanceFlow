import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';
import { Plus, Edit3, Trash2, X, ListTodo, CheckCircle2, Circle, Clock } from 'lucide-react';

const statusIcons = { 'To Do': Circle, 'In Progress': Clock, 'Done': CheckCircle2 };
const statusColors = { 'To Do': 'text-ff-400', 'In Progress': 'text-warning', 'Done': 'text-success' };
const priorityColors = { 'High': 'bg-danger/10 text-danger', 'Medium': 'bg-warning/10 text-warning', 'Low': 'bg-ff-700/30 text-ff-400' };

export default function Tasks() {
  const { API_URL } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', projectId: '', status: 'To Do', priority: 'Medium', dueDate: '' });
  const [filterProject, setFilterProject] = useState('');

  useEffect(() => {
    Promise.all([axios.get(`${API_URL}/tasks`), axios.get(`${API_URL}/projects`)])
      .then(([tRes, pRes]) => { setTasks(tRes.data); setProjects(pRes.data); })
      .finally(() => setLoading(false));
  }, [API_URL]);

  const filtered = filterProject ? tasks.filter(t => (t.projectId?._id || t.projectId) === filterProject) : tasks;

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', projectId: projects[0]?._id || '', status: 'To Do', priority: 'Medium', dueDate: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, dueDate: form.dueDate || undefined };
      if (editing) {
        const res = await axios.put(`${API_URL}/tasks/${editing._id}`, data);
        setTasks(tasks.map(t => t._id === editing._id ? res.data : t));
      } else {
        const res = await axios.post(`${API_URL}/tasks`, data);
        setTasks([res.data, ...tasks]);
      }
      setShowModal(false);
    } catch (err) { console.error(err); }
  };

  const toggleStatus = async (task) => {
    const order = ['To Do', 'In Progress', 'Done'];
    const next = order[(order.indexOf(task.status) + 1) % 3];
    const res = await axios.put(`${API_URL}/tasks/${task._id}`, { status: next });
    setTasks(tasks.map(t => t._id === task._id ? res.data : t));
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return;
    await axios.delete(`${API_URL}/tasks/${id}`);
    setTasks(tasks.filter(t => t._id !== id));
  };

  if (loading) return <div className="flex items-center justify-center h-full min-h-screen"><div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-ff-100 tracking-tight">Tasks</h1>
          <p className="text-ff-400 mt-1">Track your work items</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            className="px-4 py-2.5 bg-ff-900 border border-ff-700/30 rounded-xl text-ff-200 text-sm focus:outline-none focus:border-accent/50">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-dark text-ff-950 rounded-xl font-semibold text-sm transition-all">
            <Plus size={16} /> Add Task
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-ff-900 border border-ff-700/20 rounded-2xl">
          <ListTodo size={48} className="mx-auto text-ff-600 mb-4" />
          <h3 className="text-lg font-bold text-ff-300">No tasks yet</h3>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => {
            const Icon = statusIcons[task.status];
            return (
              <div key={task._id} className="bg-ff-900 border border-ff-700/20 rounded-xl p-4 hover:border-ff-600/30 transition-all group flex items-center gap-4">
                <button onClick={() => toggleStatus(task)} className={`shrink-0 ${statusColors[task.status]} hover:scale-110 transition-transform`}>
                  <Icon size={22} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold ${task.status === 'Done' ? 'text-ff-500 line-through' : 'text-ff-100'}`}>{task.title}</div>
                  <div className="text-xs text-ff-500 mt-0.5">{task.projectId?.name || 'No project'}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${priorityColors[task.priority]}`}>{task.priority}</span>
                  {task.dueDate && <span className="text-xs text-ff-400">{format(new Date(task.dueDate), 'MMM d')}</span>}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditing(task); setForm({ title: task.title, description: task.description, projectId: task.projectId?._id || '', status: task.status, priority: task.priority, dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '' }); setShowModal(true); }} className="p-1.5 text-ff-400 hover:text-ff-200"><Edit3 size={14} /></button>
                    <button onClick={() => handleDelete(task._id)} className="p-1.5 text-ff-400 hover:text-danger"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-ff-900 border border-ff-700/30 rounded-2xl w-full max-w-lg shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between p-6 border-b border-ff-700/20">
              <h2 className="text-lg font-bold text-ff-100">{editing ? 'Edit Task' : 'New Task'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-ff-500 hover:text-ff-300"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Project *</label>
                <select value={form.projectId} onChange={e => setForm({...form, projectId: e.target.value})} required className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50">
                  <option value="">Select project</option>
                  {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50">
                    {['To Do', 'In Progress', 'Done'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50">
                    {['Low', 'Medium', 'High'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-ff-800 text-ff-300 rounded-xl font-semibold hover:bg-ff-700">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-accent text-ff-950 rounded-xl font-semibold hover:bg-accent-dark">{editing ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


