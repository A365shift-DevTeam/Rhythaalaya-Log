import React, { useState } from 'react';
import { ApiError, api, Session } from '../api';

export function LoginPage({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try { onLogin(await api.login(email, password)); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Unable to sign in.'); }
    finally { setLoading(false); }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-mint-50 flex items-center justify-center p-4 sm:p-6">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="relative w-full max-w-md rounded-3xl bg-white/95 border border-brand-200/70 shadow-2xl shadow-brand-950/10 p-6 sm:p-8 backdrop-blur-sm">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-brand-500/25">
          <span className="material-symbols-outlined text-3xl">school</span>
        </div>
        <h1 className="font-heading text-3xl font-extrabold text-slate-900">Rhythaalaya Log</h1>
        <p className="text-sm leading-6 text-slate-500 mt-2 mb-7">Sign in securely to manage students, fees, batches, and attendance.</p>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Email address</span>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1.5 min-h-12 w-full rounded-xl border border-brand-200 bg-slate-50 px-4 py-3 text-base outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              placeholder="admin@academy.com" autoComplete="email" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Password</span>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="mt-1.5 min-h-12 w-full rounded-xl border border-brand-200 bg-slate-50 px-4 py-3 text-base outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              placeholder="At least 8 characters" autoComplete="current-password" />
          </label>
          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm px-4 py-3">{error}</div>}
          <button type="submit" disabled={loading} className="btn-brand min-h-12 w-full rounded-xl py-3 font-bold disabled:cursor-wait disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
