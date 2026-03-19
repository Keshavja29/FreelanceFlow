import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { format, subDays, startOfMonth, subMonths, isAfter } from 'date-fns';
import { 
  AreaChart, Area, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Briefcase, 
  Clock, Package, Star, MessageSquare, Phone, MoreHorizontal, ArrowUpRight, Mail
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({});
  const [chartData, setChartData] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [invRes, projRes, cliRes, taskRes] = await Promise.all([
        supabase.from('invoices').select('amount, status, created_at').eq('user_id', user.id),
        supabase.from('projects').select('status').eq('user_id', user.id),
        supabase.from('clients').select('id, name, email, default_hourly_rate').eq('user_id', user.id).limit(4),
        supabase.from('tasks').select('id, title, due_date, status').eq('user_id', user.id).neq('status', 'Done').order('due_date', { ascending: true }).limit(5)
      ]);
      
      const invoices = invRes.data || [];
      const projects = projRes.data || [];
      
      const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((acc, i) => acc + i.amount, 0);
      const pendingInvoices = invoices.filter(i => i.status === 'Sent' || i.status === 'Overdue').length;
      const activeProjects = projects.filter(p => p.status === 'Active').length;
      
      const pStats = [
        { _id: 'Active', count: activeProjects },
        { _id: 'Completed', count: projects.filter(p => p.status === 'Completed').length },
        { _id: 'On Hold', count: projects.filter(p => p.status === 'On Hold').length }
      ];
      
      setStats({
        totalRevenue,
        activeProjects,
        projectsByStatus: pStats,
        totalClients: cliRes.data?.length || 0,
        pendingTasks: taskRes.data?.length || 0,
        pendingInvoicesCount: pendingInvoices
      });
      
      setClients((cliRes.data || []).map(c => ({...c, _id: c.id, defaultHourlyRate: c.default_hourly_rate})));
      setUpcoming((taskRes.data || []).map(t => ({...t, _id: t.id, dueDate: t.due_date})));
      
      // Calculate dummy chart data 12 months (or aggregate real data)
      const months = Array.from({length: 6}).map((_, i) => ({
        revenue: Math.floor(Math.random() * 5000) + 1000
      })).reverse();
      setChartData(months);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-screen">
      <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
    </div>
  );

  const totalRev = stats?.totalRevenue || 0;
  const arr = totalRev * 1.5; // Dummy ARR calculation
  const projectGoal = 75; // Dummy percentage

  const pieData = [
    { name: 'Completed', value: stats?.projectsByStatus?.find(p => p._id === 'Completed')?.count || 1, color: '#bbf733' },
    { name: 'Active', value: stats?.activeProjects || 1, color: '#10b981' },
    { name: 'On Hold', value: stats?.projectsByStatus?.find(p => p._id === 'On Hold')?.count || 1, color: '#f59e0b' }
  ];

  return (
    <div className="flex flex-col xl:flex-row gap-6 p-6 lg:p-8 animate-fadeIn max-w-[1600px] mx-auto min-h-screen">
      
      {/* LEFT COLUMN - MAIN DASHBOARD (approx 75%) */}
      <div className="flex-1 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold text-white">Overview</h1>
        </div>

        {/* Top 4 Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-ff-900 border border-ff-700/30 rounded-2xl p-5 hover:border-ff-600/50 transition-all">
            <div className="text-xs text-ff-400 font-medium mb-2">Net revenue</div>
            <div className="text-3xl font-bold text-white mb-2">${totalRev.toLocaleString()}</div>
            <div className="text-[10px] font-medium text-ff-300 flex items-center gap-1">
              <TrendingUp size={12} className="text-accent" /> <span className="text-white">+2.4%</span> vs last month
            </div>
          </div>
          <div className="bg-ff-900 border border-ff-700/30 rounded-2xl p-5 hover:border-ff-600/50 transition-all">
            <div className="text-xs text-ff-400 font-medium mb-2">ARR</div>
            <div className="text-3xl font-bold text-white mb-2">${arr.toLocaleString()}</div>
            <div className="text-[10px] font-medium text-ff-300 flex items-center gap-1">
              <TrendingUp size={12} className="text-accent" /> <span className="text-white">+12%</span> vs last quarter
            </div>
          </div>
          <div className="bg-ff-900 border border-ff-700/30 rounded-2xl p-5 hover:border-ff-600/50 transition-all flex justify-between items-center">
            <div>
              <div className="text-xs text-ff-400 font-medium mb-2">Project Goal</div>
              <div className="text-3xl font-bold text-white mb-2">{projectGoal}%</div>
              <div className="text-[10px] text-ff-500">Target: 10/month</div>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-ff-800 border-t-accent border-r-accent flex items-center justify-center">
            </div>
          </div>
          <div className="bg-ff-900 border border-ff-700/30 rounded-2xl p-5 hover:border-ff-600/50 transition-all">
            <div className="text-xs text-ff-400 font-medium mb-2">Active Clients</div>
            <div className="text-3xl font-bold text-white mb-2">{stats?.totalClients || 0}</div>
            <div className="text-[10px] font-medium text-ff-300 flex items-center gap-1">
              <TrendingUp size={12} className="text-accent" /> <span className="text-white">+1</span> vs last week
            </div>
          </div>
        </div>

        {/* Middle Row Layout (Grid: 2 cols | 1 col stack | 2 cols) -> total 5, or 2/1/2 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          
          {/* Sales/Project Overview (col-span-2) */}
          <div className="lg:col-span-2 bg-ff-900 border border-ff-700/30 rounded-2xl p-5 flex flex-col relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-white">Project Overview</h3>
              <MoreHorizontal size={16} className="text-ff-500" />
            </div>
            <div className="flex-1 flex items-center justify-center relative">
              <div className="h-40 w-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                      {pieData.map((e, index) => <Cell key={`cell-${index}`} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-white">{stats?.activeProjects || 0}</span>
                <span className="text-[10px] text-ff-400">Active</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-3 mt-4">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                  <div>
                    <div className="text-xs font-semibold text-white">{d.name}</div>
                    <div className="text-[10px] text-ff-500">{d.value} Projects</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stacked Mini Cards (col-span-1) */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="flex-1 bg-ff-900 border border-ff-700/30 rounded-2xl p-4 flex flex-col justify-between">
              <div className="w-8 h-8 rounded-full bg-accent text-ff-950 flex items-center justify-center mb-2">
                <Users size={14} />
              </div>
              <div className="text-[10px] text-ff-400">Total Tasks</div>
              <div className="text-xl font-bold text-white">{stats?.pendingTasks || 0}</div>
              <div className="text-[10px] text-ff-500 mt-1">Pending items</div>
            </div>
            <div className="flex-1 bg-ff-900 border border-ff-700/30 rounded-2xl p-4 flex flex-col justify-between">
              <div className="w-8 h-8 rounded-full bg-success text-white flex items-center justify-center mb-2">
                <Package size={14} />
              </div>
              <div className="text-[10px] text-ff-400">Invoices</div>
              <div className="text-xl font-bold text-white">{stats?.pendingInvoicesCount || 0}</div>
              <div className="text-[10px] text-ff-500 mt-1">Pending payment</div>
            </div>
          </div>

          {/* Revenue Chart (col-span-2) */}
          <div className="lg:col-span-2 bg-ff-900 border border-ff-700/30 rounded-2xl p-5 flex flex-col">
            <h3 className="text-sm font-semibold text-white mb-1">Total Revenue</h3>
            <div className="text-xs text-ff-400 mb-6">Last 12 Months</div>
            <div className="flex-1 min-h-[160px] -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#bbf733" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#bbf733" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#202123', border: '1px solid #34363a', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#bbf733" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-ff-900 border border-ff-700/30 rounded-2xl p-5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-semibold text-white">Customer list</h3>
              <MoreHorizontal size={16} className="text-ff-500" />
            </div>
            <div className="grid grid-cols-4 text-xs font-semibold text-ff-500 mb-4 px-2">
              <div className="col-span-2">Name</div>
              <div>Hourly Rate</div>
              <div className="text-right">Total Deal Value</div>
            </div>
            <div className="space-y-3">
              {clients.map((c, i) => (
                <div key={i} className="grid grid-cols-4 items-center text-xs px-2 py-2 hover:bg-ff-850 rounded-xl transition-colors cursor-pointer">
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-linear-to-tr from-accent to-success flex items-center justify-center text-ff-950 font-bold uppercase">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{c.name}</div>
                      <div className="text-[10px] text-ff-500">{c.email}</div>
                    </div>
                  </div>
                  <div className="font-medium text-ff-300">${c.defaultHourlyRate}/hr</div>
                  <div className="text-right font-semibold text-white">
                    {/* Fake deal value for visuals */}
                    ${(Math.floor(Math.random() * 50) * 1000 + 10000).toLocaleString()}
                  </div>
                </div>
              ))}
              {clients.length === 0 && (
                <div className="text-center py-6 text-ff-500">No clients yet.</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 bg-linear-to-br from-[#1b2612] to-ff-900 border border-accent/20 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 blur-[60px] rounded-full pointer-events-none"></div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 border border-accent/20 rounded-full mb-6">
                <Star size={10} className="text-accent" />
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider">{user?.plan === 'Pro' ? 'Pro Plan Active' : 'Premium Plan'}</span>
              </div>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-4xl font-black text-white">$19</span>
                <span className="text-xs text-ff-400 font-medium mb-1 border-l border-ff-700/50 pl-2">Per Month<br/>Per User</span>
              </div>
              <p className="text-xs text-ff-300 leading-relaxed mt-4">
                {user?.plan === 'Pro' 
                  ? 'You are enjoying unlimited clients, advanced invoicing and full analytics.' 
                  : 'Improve your workplace, view and analyze your profits and losses.'}
              </p>
            </div>
            
            {user?.plan !== 'Pro' ? (
              <Link to="/dashboard/settings" className="mt-8 w-full py-3 bg-accent text-ff-950 font-bold rounded-xl text-xs flex items-center justify-between px-5 hover:bg-accent-dark transition-all shadow-[0_0_20px_rgba(187,247,51,0.2)]">
                Upgrade to Pro <ArrowUpRight size={14} />
              </Link>
            ) : (
              <div className="mt-8 w-full py-3 bg-ff-800 text-ff-300 font-bold rounded-xl text-xs flex items-center justify-center pointer-events-none">
                Subscribed
              </div>
            )}
          </div>
        </div>
      </div>


      {/* RIGHT COLUMN - NOTIFICATIONS & CONTACTS (approx 25%) */}
      <div className="w-full xl:w-[280px] flex flex-col gap-8 bg-ff-950 px-2">
        
        <div className="hidden xl:flex items-center gap-4 justify-end text-ff-400 mb-2">
          <MessageSquare size={18} className="hover:text-white cursor-pointer transition-colors" />
          <div className="w-8 h-8 rounded-full bg-accent text-ff-950 flex items-center justify-center font-bold text-xs">
            {user?.username?.charAt(0)?.toUpperCase()}
          </div>
        </div>

        {/* Notifications / Deadlines */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-4">Upcoming Deadlines</h3>
          <div className="space-y-4">
            {upcoming.length > 0 ? upcoming.map(task => (
              <div key={task._id} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-warning/10 text-warning shrink-0 flex items-center justify-center mt-0.5">
                  <Clock size={12} />
                </div>
                <div>
                  <div className="text-xs font-medium text-white line-clamp-1">{task.title}</div>
                  <div className="text-[10px] text-ff-500 mt-0.5">{format(new Date(task.dueDate), 'MMM d, yyyy')}</div>
                </div>
              </div>
            )) : (
              <div className="text-xs text-ff-500">No immediate deadlines coming up.</div>
            )}
          </div>
        </div>

        {/* Activities */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { text: 'Invoice INV-004 sent', time: 'Just now', icon: true },
              { text: 'New client Nexus Design added', time: '47 Minutes ago', icon: false },
              { text: 'Completed E-Commerce API', time: '1 Days ago', icon: true },
            ].map((act, i) => (
              <div key={i} className="flex gap-3 relative">
                {i < 2 && <div className="absolute left-3 top-6 bottom-0 w-px bg-ff-800"></div>}
                <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center mt-0.5 z-10 ${act.icon ? 'bg-accent/10 border border-accent/30' : 'bg-ff-800'}`}>
                  {act.icon ? <div className="w-2 h-2 rounded-full bg-accent"></div> : <div className="w-2 h-2 rounded-full bg-ff-500"></div>}
                </div>
                <div>
                  <div className="text-xs font-medium text-ff-200">{act.text}</div>
                  <div className="text-[10px] text-ff-500 mt-0.5">{act.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contacts */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-4">Quick Contacts</h3>
          <div className="space-y-1">
            {clients.slice(0, 5).map((c, i) => (
              <div key={i} className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${i === 2 ? 'bg-ff-900 border border-accent/30 shadow-[0_0_15px_rgba(187,247,51,0.05)]' : 'hover:bg-ff-900'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-ff-800 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                    {c.name.substring(0,2)}
                  </div>
                  <div className="text-xs font-medium text-white">{c.name}</div>
                </div>
                {i === 2 ? (
                  <div className="flex items-center gap-2">
                    <Mail size={12} className="text-ff-400 hover:text-white" />
                    <div className="w-6 h-6 bg-accent rounded-lg flex items-center justify-center text-ff-950">
                      <Phone size={10} />
                    </div>
                  </div>
                ) : (
                  <MoreHorizontal size={14} className="text-ff-500" />
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
