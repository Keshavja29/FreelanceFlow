import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Zap, Mail, Lock, User, ArrowRight } from 'lucide-react';

export default function Register() {
  const { register: registerUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await registerUser(form.username, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ff-950 flex items-center justify-center p-4">
      <div className="w-full max-w-[960px] min-h-[580px] bg-ff-900 rounded-3xl shadow-2xl shadow-black/40 overflow-hidden flex animate-fadeIn border border-ff-700/20">

        {/* Left — Decorative Image Panel */}
        <div className="hidden md:flex w-1/2 relative overflow-hidden">
          <img src="/auth-bg.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-br from-accent/40 via-transparent to-black/60"></div>
          <div className="relative z-10 flex flex-col justify-end p-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-4 w-fit">
              <Zap size={14} className="text-white" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">FreelanceFlow</span>
            </div>
            <h2 className="text-4xl font-black text-white leading-tight tracking-tight">
              Let's Get<br />Started!
            </h2>
            <p className="text-white/60 text-sm mt-3 max-w-[240px]">
              Join thousands of freelancers managing their business smarter.
            </p>
          </div>
        </div>

        {/* Right — Form Panel */}
        <div className="w-full md:w-1/2 flex flex-col justify-center p-8 md:p-12 bg-ff-950">
          <div className="md:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold text-ff-100">FreelanceFlow</span>
          </div>

          <h1 className="text-2xl font-black text-ff-100 tracking-tight">Create Account</h1>
          <p className="text-ff-400 text-sm mt-1 mb-8">Fill in your details to get started</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-danger/10 border border-danger/20 text-danger text-sm px-4 py-2.5 rounded-xl">{error}</div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-2">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ff-500" />
                <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required
                  className="w-full pl-11 pr-4 py-3 bg-ff-900 border border-ff-700/30 rounded-xl text-ff-100 text-sm focus:outline-none focus:border-accent/50 transition-colors placeholder:text-ff-600"
                  placeholder="yourname" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-2">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ff-500" />
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required
                  className="w-full pl-11 pr-4 py-3 bg-ff-900 border border-ff-700/30 rounded-xl text-ff-100 text-sm focus:outline-none focus:border-accent/50 transition-colors placeholder:text-ff-600"
                  placeholder="you@example.com" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-2">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ff-500" />
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required minLength={6}
                  className="w-full pl-11 pr-4 py-3 bg-ff-900 border border-ff-700/30 rounded-xl text-ff-100 text-sm focus:outline-none focus:border-accent/50 transition-colors placeholder:text-ff-600"
                  placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-accent hover:bg-accent-dark text-ff-950 font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg hover:shadow-accent/25 text-sm">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><span>Create Account</span><ArrowRight size={16} /></>}
            </button>

            <div className="relative flex items-center my-2">
              <div className="flex-1 border-t border-ff-700/30"></div>
              <span className="px-4 text-[10px] text-ff-500 uppercase font-bold tracking-widest">or</span>
              <div className="flex-1 border-t border-ff-700/30"></div>
            </div>

            <p className="text-center text-ff-400 text-sm">
              Already have an account? <Link to="/login" className="text-accent hover:text-accent-light font-semibold">Log in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

