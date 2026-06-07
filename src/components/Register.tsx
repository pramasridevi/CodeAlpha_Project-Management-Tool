import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutGrid, AlertCircle, Loader } from 'lucide-react';

interface RegisterProps {
  onToggleLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onToggleLogin }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Member');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!name || !email || !password) {
      setError('Please fill in check credentials.');
      setSubmitting(false);
      return;
    }

    const res = await register(name, email, password, role);
    if (!res.success) {
      setError(res.error || 'Server rejected registration.');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] relative overflow-hidden flex flex-col justify-center py-12 px-6 lg:px-8">
      {/* Dynamic Ambient Background Glow Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#f59e0b]/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="flex justify-center items-center gap-3 text-indigo-400 font-bold text-3xl font-sans mb-3">
          <div className="bg-indigo-500/15 p-2 rounded-xl border border-indigo-550/20">
            <LayoutGrid className="h-8 w-8" />
          </div>
          <span className="tracking-tight">Sphere Workspace</span>
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-100 tracking-tight font-sans">
          Create collaborative account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Or{' '}
          <button
            onClick={onToggleLogin}
            className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            log in to existing account
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white/5 backdrop-blur-md py-8 px-4 shadow-xl border border-white/10 rounded-2xl sm:px-10 text-left">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/25 p-3.5 rounded-xl flex items-center gap-2.5 text-rose-300 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 font-mono">
                Your Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-455 transition-all text-xs"
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 font-mono">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-455 transition-all text-xs"
                placeholder="jane@company.com"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 font-mono">
                Professional Role
              </label>
              <select
                id="role"
                name="role"
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-455 transition-all text-xs cursor-pointer"
              >
                <option value="Lead Developer">Lead Developer</option>
                <option value="Product Manager">Product Manager</option>
                <option value="Designer">UI/UX Designer</option>
                <option value="Architect">Software Architect</option>
                <option value="QA Engineer">QA Engineer</option>
                <option value="Contributor">Contributor</option>
              </select>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 font-mono">
                Security Password (min 6 chars)
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-455 transition-all text-xs"
                placeholder="••••••••••••"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 hover:shadow-indigo-500/15 hover:shadow-lg transition-all flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wider cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Launching account...</span>
                  </>
                ) : (
                  <span>Register & Begin</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
