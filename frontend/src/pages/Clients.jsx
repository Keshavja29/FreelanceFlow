import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { Plus, Edit3, Trash2, X, Users, Building2, DollarSign, AlertTriangle } from 'lucide-react';

export default function Clients() {
  const { user } = useContext(AuthContext);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', defaultHourlyRate: 50, notes: '' });
  const [error, setError] = useState('');

  const fetchClients = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      // Map 'id' to '_id' for frontend compatibility
      setClients(data.map(c => ({ ...c, _id: c.id, defaultHourlyRate: c.default_hourly_rate })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClients(); }, [user]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', company: '', defaultHourlyRate: 50, notes: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (client) => {
    setEditing(client);
    setForm({ name: client.name, email: client.email, phone: client.phone, company: client.company, defaultHourlyRate: client.defaultHourlyRate, notes: client.notes });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        name: form.name, email: form.email || null, 
        default_hourly_rate: form.defaultHourlyRate,
        user_id: user.id
      };
      
      if (editing) {
        const { data, error } = await supabase.from('clients').update(payload).eq('id', editing.id).select().single();
        if (error) throw error;
        setClients(clients.map(c => c._id === editing._id ? { ...data, _id: data.id, defaultHourlyRate: data.default_hourly_rate} : c));
      } else {
        const { data, error } = await supabase.from('clients').insert([payload]).select().single();
        if (error) throw error;
        setClients([{ ...data, _id: data.id, defaultHourlyRate: data.default_hourly_rate}, ...clients]);
      }
      setShowModal(false);
    } catch (err) {
      setError(err.message || 'Error saving client');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this client?')) return;
    try {
      await supabase.from('clients').delete().eq('id', id);
      setClients(clients.filter(c => c._id !== id));
    } catch (err) { console.error(err); }
  };


  const isFreeLimitReached = user?.plan === 'Free' && clients.length >= 2;

  if (loading) return <div className="flex items-center justify-center h-full min-h-screen"><div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-ff-100 tracking-tight">Clients</h1>
          <p className="text-ff-400 mt-1">Manage your client relationships</p>
        </div>
        <div className="flex items-center gap-3">
          {isFreeLimitReached && (
            <div className="flex items-center gap-2 px-4 py-2 bg-warning/10 border border-warning/20 rounded-xl text-warning text-xs font-bold">
              <AlertTriangle size={14} /> Free limit (2/2)
            </div>
          )}
          <button onClick={openCreate} disabled={isFreeLimitReached}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-dark text-ff-950 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <Plus size={16} /> Add Client
          </button>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-20 bg-ff-900 border border-ff-700/20 rounded-2xl">
          <Users size={48} className="mx-auto text-ff-600 mb-4" />
          <h3 className="text-lg font-bold text-ff-300">No clients yet</h3>
          <p className="text-ff-500 mt-1 text-sm">Add your first client to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {clients.map(client => (
            <div key={client._id} className="bg-ff-900 border border-ff-700/20 rounded-2xl p-5 hover:border-ff-600/30 transition-all flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                  <span className="text-accent font-bold text-lg">{client.name[0]}</span>
                </div>
                <div>
                  <h3 className="font-bold text-ff-100 text-lg">{client.name}</h3>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-ff-400">
                    {client.company && <span className="flex items-center gap-1"><Building2 size={12} /> {client.company}</span>}
                    {client.email && <span>{client.email}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-bold text-success flex items-center gap-1"><DollarSign size={14} />{client.defaultHourlyRate}/hr</div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(client)} className="p-2 bg-ff-800 text-ff-300 rounded-lg hover:bg-ff-700 transition-colors"><Edit3 size={16} /></button>
                  <button onClick={() => handleDelete(client._id)} className="p-2 bg-ff-800 text-danger rounded-lg hover:bg-danger/20 transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-ff-900 border border-ff-700/30 rounded-2xl w-full max-w-lg shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between p-6 border-b border-ff-700/20">
              <h2 className="text-lg font-bold text-ff-100">{editing ? 'Edit Client' : 'New Client'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-ff-500 hover:text-ff-300"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="bg-danger/10 border border-danger/20 text-danger text-sm px-4 py-2 rounded-xl">{error}</div>}
              <div>
                <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Company</label>
                  <input value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Hourly Rate ($)</label>
                  <input type="number" value={form.defaultHourlyRate} onChange={e => setForm({...form, defaultHourlyRate: Number(e.target.value)})} className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-ff-800 text-ff-300 rounded-xl font-semibold hover:bg-ff-700 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-accent text-ff-950 rounded-xl font-semibold hover:bg-accent-dark transition-colors">{editing ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

