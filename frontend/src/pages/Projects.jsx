import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';
import { Plus, Edit3, Trash2, X, FolderKanban, DollarSign } from 'lucide-react';

const statusColors = { 'Active': 'bg-success/10 text-success', 'Completed': 'bg-accent/10 text-accent', 'On Hold': 'bg-warning/10 text-warning' };

export default function Projects() {
  const { API_URL } = useContext(AuthContext);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', clientId: '', status: 'Active', budget: 0, deadline: '' });

  useEffect(() => {
    Promise.all([
      axios.get(`${API_URL}/projects`),
      axios.get(`${API_URL}/clients`)
    ]).then(([pRes, cRes]) => {
      setProjects(pRes.data);
      setClients(cRes.data);
    }).finally(() => setLoading(false));
  }, [API_URL]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', clientId: clients[0]?._id || '', status: 'Active', budget: 0, deadline: '' });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description, clientId: p.clientId?._id || p.clientId, status: p.status, budget: p.budget, deadline: p.deadline ? format(new Date(p.deadline), 'yyyy-MM-dd') : '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, budget: Number(form.budget), deadline: form.deadline || undefined };
      if (editing) {
        const res = await axios.put(`${API_URL}/projects/${editing._id}`, data);
        setProjects(projects.map(p => p._id === editing._id ? res.data : p));
      } else {
        const res = await axios.post(`${API_URL}/projects`, data);
        setProjects([res.data, ...projects]);
      }
      setShowModal(false);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project?')) return;
    await axios.delete(`${API_URL}/projects/${id}`);
    setProjects(projects.filter(p => p._id !== id));
  };

  if (loading) return <div className="flex items-center justify-center h-full min-h-screen"><div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-ff-100 tracking-tight">Projects</h1>
          <p className="text-ff-400 mt-1">Track your project progress and budgets</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-dark text-ff-950 rounded-xl font-semibold text-sm transition-all">
          <Plus size={16} /> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-ff-900 border border-ff-700/20 rounded-2xl">
          <FolderKanban size={48} className="mx-auto text-ff-600 mb-4" />
          <h3 className="text-lg font-bold text-ff-300">No projects yet</h3>
          <p className="text-ff-500 mt-1 text-sm">Create your first project</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map(project => (
            <div key={project._id} className="bg-ff-900 border border-ff-700/20 rounded-2xl p-5 hover:border-ff-600/30 transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                    <FolderKanban size={20} className="text-accent" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-ff-100 text-lg truncate">{project.name}</h3>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-ff-400">
                      <span>{project.clientId?.name || 'No client'}</span>
                      {project.deadline && <span>Due: {format(new Date(project.deadline), 'MMM d, yyyy')}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${statusColors[project.status]}`}>{project.status}</span>
                  <div className="text-right">
                    <div className="text-sm font-bold text-ff-200 flex items-center gap-1"><DollarSign size={14} />{project.budget?.toLocaleString()}</div>
                    <div className="text-[10px] text-ff-500">budget</div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(project)} className="p-2 bg-ff-800 text-ff-300 rounded-lg hover:bg-ff-700"><Edit3 size={16} /></button>
                    <button onClick={() => handleDelete(project._id)} className="p-2 bg-ff-800 text-danger rounded-lg hover:bg-danger/20"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-ff-900 border border-ff-700/30 rounded-2xl w-full max-w-lg shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between p-6 border-b border-ff-700/20">
              <h2 className="text-lg font-bold text-ff-100">{editing ? 'Edit Project' : 'New Project'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-ff-500 hover:text-ff-300"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Client *</label>
                <select value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})} required className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50">
                  <option value="">Select client</option>
                  {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50">
                    {['Active', 'Completed', 'On Hold'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Budget ($)</label>
                  <input type="number" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Deadline</label>
                  <input type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-ff-800 text-ff-300 rounded-xl font-semibold hover:bg-ff-700 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-accent text-ff-950 rounded-xl font-semibold hover:bg-accent-dark">{editing ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


