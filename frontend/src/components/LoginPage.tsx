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
    <main className="min-h-screen bg-mint-50 flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-3xl bg-white border border-brand-200/70 shadow-xl p-8">
        <div className="w-14 h-14 rounded-2xl bg-brand-500 text-white flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-3xl">school</span>
        </div>
        <h1 className="font-heading text-3xl font-extrabold text-slate-900">Rhythaalaya Log</h1>
        <p className="text-sm text-slate-500 mt-2 mb-7">Sign in to your academy workspace or platform console.</p>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-bold text-slate-600">Email address</span>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-brand-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="admin@academy.com" autoComplete="email" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-600">Password</span>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-brand-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="At least 8 characters" autoComplete="current-password" />
          </label>
          {error && <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-3">{error}</div>}
          <button disabled={loading} className="btn-brand w-full rounded-xl py-3 font-bold disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
