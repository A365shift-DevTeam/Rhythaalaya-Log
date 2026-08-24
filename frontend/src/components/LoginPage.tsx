import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { JisIcon } from './JisIcon';
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
    <main className="relative min-h-screen overflow-hidden bg-[#f4fbf7] flex items-center justify-center p-4 sm:p-6">
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#cbecd8]/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[#9fd1e5]/30 blur-3xl" />
      <Card className="relative w-full max-w-md gap-0 rounded-3xl bg-white/85 border border-[#dbdbdb]/80 shadow-2xl shadow-black/5 p-6 sm:p-8 backdrop-blur-2xl">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#3fc073] to-[#35a160] text-white flex items-center justify-center mb-6 shadow-lg shadow-[#3fc073]/25">
          <JisIcon className="text-3xl">school</JisIcon>
        </div>
        <h1 className="font-heading text-3xl font-bold text-[#212121] tracking-tight">Rhythaalaya Log</h1>
        <p className="text-sm leading-6 text-[#808080] mt-2 mb-7 font-sans">Sign in securely to manage students, fees, batches, and attendance.</p>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#575757]">Email address</span>
            <Input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1.5 min-h-12 w-full rounded-2xl border border-[#dbdbdb] bg-[#f0f0f0] px-4 py-3 text-sm text-[#212121] outline-none transition-all placeholder:text-[#9e9e9e] focus:border-[#3fc073] focus:bg-white focus:ring-4 focus:ring-[#3fc073]/15"
              placeholder="admin@academy.com" autoComplete="email" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#575757]">Password</span>
            <Input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="mt-1.5 min-h-12 w-full rounded-2xl border border-[#dbdbdb] bg-[#f0f0f0] px-4 py-3 text-sm text-[#212121] outline-none transition-all placeholder:text-[#9e9e9e] focus:border-[#3fc073] focus:bg-white focus:ring-4 focus:ring-[#3fc073]/15"
              placeholder="At least 8 characters" autoComplete="current-password" />
          </label>
          {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 text-sm px-4 py-3 font-medium">{error}</div>}
          <Button type="submit" disabled={loading} className="btn-brand min-h-12 w-full rounded-2xl py-3 text-sm font-semibold tracking-wide disabled:cursor-wait disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
