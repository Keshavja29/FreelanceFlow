import React, { useContext, useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { LayoutDashboard, Users, FolderKanban, ListTodo, Clock, FileText, Settings, LogOut, Zap, Timer, ChevronLeft, ChevronRight } from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dashboard/clients', icon: Users, label: 'Clients' },
  { to: '/dashboard/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/dashboard/tasks', icon: ListTodo, label: 'Tasks' },
  { to: '/dashboard/time', icon: Clock, label: 'Time Logs' },
  { to: '/dashboard/invoices', icon: FileText, label: 'Invoices' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [timer, setTimer] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  // Check for active timer on mount
  useEffect(() => {
    const stored = localStorage.getItem('ff_timer');
    if (stored) {
      const parsed = JSON.parse(stored);
      setTimer(parsed);
    }
    // Also check server for active timer
    const checkTimer = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('timelogs')
          .select('id, start_time, projects(name)')
          .eq('user_id', user.id)
          .eq('is_wip', true)
          .single();
          
        if (data) {
          const t = { id: data.id, projectName: data.projects?.name, startTime: data.start_time };
          setTimer(t);
          localStorage.setItem('ff_timer', JSON.stringify(t));
        }
      } catch {}
    };
    checkTimer();
  }, [user]);

  // Timer tick
  useEffect(() => {
    if (!timer?.startTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(timer.startTime).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const stopTimer = async () => {
    if (!timer?.id) return;
    try {
      const durationSeconds = Math.floor((Date.now() - new Date(timer.startTime).getTime()) / 1000);
      await supabase.from('timelogs').update({
        is_wip: false,
        end_time: new Date().toISOString(),
        duration_seconds: durationSeconds
      }).eq('id', timer.id);
      
      setTimer(null);
      setElapsed(0);
      localStorage.removeItem('ff_timer');
    } catch (err) {
      console.error('Error stopping timer:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };


  return (
    <div className="min-h-screen bg-ff-950 flex">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-ff-900 border-r border-ff-700/20 flex flex-col transition-all duration-300 sticky top-0 h-screen z-30`}>
        {/* Logo */}
        <div className={`p-4 ${collapsed ? 'px-3' : 'px-6'} pt-6 flex items-center gap-3`}>
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-accent/20">
            <Zap size={20} className="text-white" />
          </div>
          {!collapsed && <span className="text-lg font-black text-ff-100 tracking-tight">FreelanceFlow</span>}
        </div>

        {/* Nav */}
        <nav className="mt-6 flex-1 px-3 space-y-1">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${isActive ? 'bg-accent/10 text-accent' : 'text-ff-400 hover:text-ff-200 hover:bg-ff-800/50'}`}>
              <item.icon size={20} className="shrink-0" />
              {!collapsed && <span className="text-sm font-semibold">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Active Timer */}
        {timer && (
          <div className={`mx-3 mb-3 p-3 bg-accent/10 border border-accent/20 rounded-xl ${collapsed ? 'text-center' : ''}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
              {!collapsed && <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Recording</span>}
            </div>
            <div className={`text-accent font-mono font-bold ${collapsed ? 'text-xs' : 'text-lg'}`}>{formatTime(elapsed)}</div>
            {!collapsed && timer.projectName && <div className="text-ff-400 text-xs mt-1 truncate">{timer.projectName}</div>}
            <button onClick={stopTimer} className="mt-2 w-full py-1.5 bg-danger/20 text-danger text-xs font-bold rounded-lg hover:bg-danger/30 transition-colors">
              {collapsed ? '■' : 'Stop'}
            </button>
          </div>
        )}

        {/* User & Collapse */}
        <div className="p-3 border-t border-ff-700/20">
          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                <span className="text-accent font-bold text-sm">{user?.username?.[0]?.toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ff-200 truncate">{user?.username}</div>
                <div className="text-[10px] text-ff-500 uppercase font-bold tracking-wider">{user?.plan || 'Free'} Plan</div>
              </div>
            </div>
          )}
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 text-ff-500 hover:text-danger w-full rounded-xl hover:bg-danger/5 transition-all">
            <LogOut size={18} /> {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-3 px-3 py-2 text-ff-500 hover:text-ff-300 w-full rounded-xl hover:bg-ff-800/50 transition-all mt-1">
            {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span className="text-sm">Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet context={{ timer, setTimer, elapsed, stopTimer }} />
      </main>
    </div>
  );
}


