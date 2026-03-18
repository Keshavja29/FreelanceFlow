import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Settings as SettingsIcon, Crown, Check, Zap, Shield, FileText, Users, Clock, BarChart3 } from 'lucide-react';

const features = {
  Free: [
    { icon: Users, text: 'Up to 2 clients' },
    { icon: Zap, text: 'Unlimited projects' },
    { icon: Clock, text: 'Time tracking' },
    { icon: BarChart3, text: 'Basic dashboard' },
  ],
  Pro: [
    { icon: Users, text: 'Unlimited clients' },
    { icon: Zap, text: 'Unlimited projects' },
    { icon: Clock, text: 'Advanced time tracking' },
    { icon: FileText, text: 'PDF invoice generation' },
    { icon: BarChart3, text: 'Full analytics dashboard' },
    { icon: Shield, text: 'Priority support' },
  ]
};

export default function Settings() {
  const { user, updateUser, API_URL } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const currentPlan = user?.plan || 'Free';

  const togglePlan = async (plan) => {
    if (plan === currentPlan) return;
    setLoading(true);
    setSuccess('');
    try {
      const res = await axios.put(`${API_URL}/dashboard/plan`, { plan });
      updateUser({ plan: res.data.plan });
      setSuccess(`Successfully ${plan === 'Pro' ? 'upgraded to' : 'downgraded to'} ${plan} plan!`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-ff-100 tracking-tight">Settings</h1>
        <p className="text-ff-400 mt-1">Manage your account and subscription</p>
      </div>

      {success && (
        <div className="mb-6 bg-success/10 border border-success/20 text-success text-sm px-5 py-3 rounded-xl flex items-center gap-2 animate-fadeIn">
          <Check size={16} /> {success}
        </div>
      )}

      {/* Account Info */}
      <div className="bg-ff-900 border border-ff-700/20 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-ff-200 mb-4 flex items-center gap-2">
          <SettingsIcon size={20} className="text-accent" /> Account
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Username</div>
            <div className="text-ff-100 font-semibold text-lg">{user?.username}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Email</div>
            <div className="text-ff-100 font-semibold text-lg">{user?.email}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Current Plan</div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-lg text-sm font-bold ${currentPlan === 'Pro' ? 'bg-accent/10 text-accent' : 'bg-ff-700/30 text-ff-400'}`}>
                {currentPlan === 'Pro' && <Crown size={14} className="inline mr-1 -mt-0.5" />}
                {currentPlan}
              </span>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Member Since</div>
            <div className="text-ff-100 font-semibold text-lg">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Plans */}
      <h2 className="text-lg font-bold text-ff-200 mb-4 flex items-center gap-2">
        <Crown size={20} className="text-accent" /> Plans
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {/* Free Plan */}
        <div className={`bg-ff-900 border rounded-2xl p-6 transition-all ${currentPlan === 'Free' ? 'border-accent/50 ring-1 ring-accent/20' : 'border-ff-700/20 hover:border-ff-600/30'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-ff-100">Free</h3>
            {currentPlan === 'Free' && (
              <span className="px-3 py-1 bg-accent/10 text-accent text-xs font-bold rounded-lg">Current</span>
            )}
          </div>
          <div className="text-3xl font-black text-ff-100 mb-1">$0 <span className="text-sm font-medium text-ff-500">/month</span></div>
          <p className="text-ff-400 text-sm mb-6">Perfect for getting started</p>
          <div className="space-y-3 mb-6">
            {features.Free.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-ff-300">
                <f.icon size={16} className="text-ff-500" /> {f.text}
              </div>
            ))}
          </div>
          <button onClick={() => togglePlan('Free')} disabled={currentPlan === 'Free' || loading}
            className={`w-full py-3 rounded-xl font-semibold transition-all text-sm ${
              currentPlan === 'Free'
                ? 'bg-ff-800 text-ff-500 cursor-default'
                : 'bg-ff-800 text-ff-300 hover:bg-ff-700'
            } disabled:opacity-50`}>
            {currentPlan === 'Free' ? 'Active Plan' : 'Downgrade'}
          </button>
        </div>

        {/* Pro Plan */}
        <div className={`bg-ff-900 border rounded-2xl p-6 transition-all relative overflow-hidden ${currentPlan === 'Pro' ? 'border-accent/50 ring-1 ring-accent/20' : 'border-ff-700/20 hover:border-ff-600/30'}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-[60px]"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-ff-100 flex items-center gap-2"><Crown size={20} className="text-accent" /> Pro</h3>
              {currentPlan === 'Pro' && (
                <span className="px-3 py-1 bg-accent/10 text-accent text-xs font-bold rounded-lg">Current</span>
              )}
            </div>
            <div className="text-3xl font-black text-accent mb-1">$19 <span className="text-sm font-medium text-ff-500">/month</span></div>
            <p className="text-ff-400 text-sm mb-6">For serious freelancers</p>
            <div className="space-y-3 mb-6">
              {features.Pro.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-ff-300">
                  <f.icon size={16} className="text-accent" /> {f.text}
                </div>
              ))}
            </div>
            <button onClick={() => togglePlan('Pro')} disabled={currentPlan === 'Pro' || loading}
              className={`w-full py-3 rounded-xl font-semibold transition-all text-sm ${
                currentPlan === 'Pro'
                  ? 'bg-accent/10 text-accent cursor-default'
                  : 'bg-accent text-ff-950 hover:bg-accent-dark hover:shadow-lg hover:shadow-accent/20'
              } disabled:opacity-50`}>
              {loading ? 'Processing...' : currentPlan === 'Pro' ? 'Active Plan' : 'Upgrade to Pro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

