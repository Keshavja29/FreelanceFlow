import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { Clock, Plus, Trash2, X, Play, Square, Calendar, Filter } from 'lucide-react';

export default function TimeLogs() {
  const { API_URL } = useContext(AuthContext);
  const { timer, setTimer, elapsed, stopTimer } = useOutletContext();
  const [logs, setLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [filterProject, setFilterProject] = useState('');
  const [manualForm, setManualForm] = useState({ projectId: '', date: format(new Date(), 'yyyy-MM-dd'), hours: 1, description: '' });
  const [startForm, setStartForm] = useState({ projectId: '', description: '' });

  const fetchData = async () => {
    try {
      const params = {};
      if (filterProject) params.projectId = filterProject;
      const [logsRes, projRes] = await Promise.all([
        axios.get(`${API_URL}/timelogs`, { params }),
        axios.get(`${API_URL}/projects`)
      ]);
      setLogs(logsRes.data);
      setProjects(projRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [API_URL, filterProject]);

  const handleStartTimer = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/timelogs/start`, startForm);
      const t = { id: res.data._id, projectName: res.data.projectId?.name, startTime: res.data.startTime };
      setTimer(t);
      localStorage.setItem('ff_timer', JSON.stringify(t));
      setShowStart(false);
      setStartForm({ projectId: '', description: '' });
    } catch (err) { console.error(err); }
  };

  const handleStopTimer = async () => {
    await stopTimer();
    await fetchData();
  };

  const handleManualEntry = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/timelogs/manual`, manualForm);
      setShowManual(false);
      setManualForm({ projectId: '', date: format(new Date(), 'yyyy-MM-dd'), hours: 1, description: '' });
      await fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this time log?')) return;
    await axios.delete(`${API_URL}/timelogs/${id}`);
    setLogs(logs.filter(l => l._id !== id));
  };

  const formatDuration = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const formatElapsed = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const totalMinutes = logs.reduce((sum, l) => sum + (l.duration || 0), 0);
  const totalEarnings = logs.reduce((sum, l) => sum + ((l.duration / 60) * l.hourlyRate), 0);

  if (loading) return <div className="flex items-center justify-center h-full min-h-screen"><div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-ff-100 tracking-tight">Time Logs</h1>
          <p className="text-ff-400 mt-1">Track your working hours</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            className="px-4 py-2.5 bg-ff-900 border border-ff-700/30 rounded-xl text-ff-200 text-sm focus:outline-none focus:border-accent/50">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <button onClick={() => { setManualForm({ ...manualForm, projectId: projects[0]?._id || '' }); setShowManual(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-ff-800 border border-ff-700/30 text-ff-300 rounded-xl font-semibold text-sm hover:bg-ff-700/50 transition-all">
            <Plus size={16} /> Manual Entry
          </button>
          {timer ? (
            <button onClick={handleStopTimer}
              className="flex items-center gap-2 px-5 py-2.5 bg-danger hover:bg-danger/80 text-white rounded-xl font-semibold text-sm transition-all animate-pulse-glow">
              <Square size={16} /> Stop {formatElapsed(elapsed)}
            </button>
          ) : (
            <button onClick={() => { setStartForm({ projectId: projects[0]?._id || '', description: '' }); setShowStart(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-dark text-ff-950 rounded-xl font-semibold text-sm transition-all">
              <Play size={16} /> Start Timer
            </button>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-ff-900 border border-ff-700/20 rounded-2xl p-4">
          <div className="text-xs text-ff-400 font-bold uppercase tracking-wider mb-1">Total Entries</div>
          <div className="text-2xl font-black text-ff-100">{logs.length}</div>
        </div>
        <div className="bg-ff-900 border border-ff-700/20 rounded-2xl p-4">
          <div className="text-xs text-ff-400 font-bold uppercase tracking-wider mb-1">Total Hours</div>
          <div className="text-2xl font-black text-accent">{formatDuration(totalMinutes)}</div>
        </div>
        <div className="bg-ff-900 border border-ff-700/20 rounded-2xl p-4">
          <div className="text-xs text-ff-400 font-bold uppercase tracking-wider mb-1">Total Earnings</div>
          <div className="text-2xl font-black text-success">${Math.round(totalEarnings).toLocaleString()}</div>
        </div>
      </div>

      {/* Logs List */}
      {logs.length === 0 ? (
        <div className="text-center py-20 bg-ff-900 border border-ff-700/20 rounded-2xl">
          <Clock size={48} className="mx-auto text-ff-600 mb-4" />
          <h3 className="text-lg font-bold text-ff-300">No time logs yet</h3>
          <p className="text-ff-500 mt-1 text-sm">Start a timer or add a manual entry</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log._id} className="bg-ff-900 border border-ff-700/20 rounded-xl p-4 hover:border-ff-600/30 transition-all group flex items-center gap-4">
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                <Clock size={18} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ff-100">{log.projectId?.name || 'Unknown Project'}</div>
                <div className="text-xs text-ff-500 mt-0.5 flex items-center gap-2">
                  <span>{format(new Date(log.startTime), 'MMM d, yyyy')}</span>
                  {log.taskId?.title && <span>• {log.taskId.title}</span>}
                  {log.description && <span>• {log.description}</span>}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-bold text-ff-200">{log.duration ? formatDuration(log.duration) : 'Running...'}</div>
                  <div className="text-[10px] text-ff-500">${log.hourlyRate}/hr</div>
                </div>
                {log.billed ? (
                  <span className="px-2.5 py-1 bg-success/10 text-success text-[10px] font-bold rounded-lg uppercase">Billed</span>
                ) : (
                  <span className="px-2.5 py-1 bg-warning/10 text-warning text-[10px] font-bold rounded-lg uppercase">Unbilled</span>
                )}
                <button onClick={() => handleDelete(log._id)} className="p-1.5 text-ff-500 hover:text-danger opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Start Timer Modal */}
      {showStart && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-ff-900 border border-ff-700/30 rounded-2xl w-full max-w-md shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between p-6 border-b border-ff-700/20">
              <h2 className="text-lg font-bold text-ff-100">Start Timer</h2>
              <button onClick={() => setShowStart(false)} className="p-1 text-ff-500 hover:text-ff-300"><X size={20} /></button>
            </div>
            <form onSubmit={handleStartTimer} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Project *</label>
                <select value={startForm.projectId} onChange={e => setStartForm({ ...startForm, projectId: e.target.value })} required
                  className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50">
                  <option value="">Select project</option>
                  {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Description</label>
                <input value={startForm.description} onChange={e => setStartForm({ ...startForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50"
                  placeholder="What are you working on?" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowStart(false)} className="flex-1 py-3 bg-ff-800 text-ff-300 rounded-xl font-semibold hover:bg-ff-700 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-accent text-ff-950 rounded-xl font-semibold hover:bg-accent-dark transition-colors flex items-center justify-center gap-2">
                  <Play size={16} /> Start
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManual && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-ff-900 border border-ff-700/30 rounded-2xl w-full max-w-md shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between p-6 border-b border-ff-700/20">
              <h2 className="text-lg font-bold text-ff-100">Manual Time Entry</h2>
              <button onClick={() => setShowManual(false)} className="p-1 text-ff-500 hover:text-ff-300"><X size={20} /></button>
            </div>
            <form onSubmit={handleManualEntry} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Project *</label>
                <select value={manualForm.projectId} onChange={e => setManualForm({ ...manualForm, projectId: e.target.value })} required
                  className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50">
                  <option value="">Select project</option>
                  {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Date *</label>
                  <input type="date" value={manualForm.date} onChange={e => setManualForm({ ...manualForm, date: e.target.value })} required
                    className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Hours *</label>
                  <input type="number" step="0.25" min="0.25" value={manualForm.hours} onChange={e => setManualForm({ ...manualForm, hours: Number(e.target.value) })} required
                    className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Description</label>
                <input value={manualForm.description} onChange={e => setManualForm({ ...manualForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50"
                  placeholder="What did you work on?" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowManual(false)} className="flex-1 py-3 bg-ff-800 text-ff-300 rounded-xl font-semibold hover:bg-ff-700 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-accent text-ff-950 rounded-xl font-semibold hover:bg-accent-dark transition-colors">Add Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

