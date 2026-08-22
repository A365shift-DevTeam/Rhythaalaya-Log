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
    try {
      onLogin(await api.login(email, password));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That email and password do not match.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh grid-cols-1 bg-bg lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/*
        The ink panel is the same spine the signed-in app uses, so the
        product looks like itself from the first screen.
      */}
      <section className="relative flex flex-col justify-center bg-rail px-6 py-10 sm:px-10 lg:px-14 lg:py-16">
        <div>
          <p className="sam-mark text-[13px] tracking-[0.35em]" aria-hidden="true">|·○·○·○</p>
          <h1 className="display-lg mt-4 text-[clamp(2rem,1.35rem+2.6vw,2.875rem)] text-rail-text">
            Rhythaalaya Log
          </h1>
          <p className="mt-3.5 max-w-[26rem] text-[14px] leading-[1.6] text-rail-text-2">
            The register for a performing-arts academy — students, batches, attendance
            and fees, kept in one place.
          </p>
        </div>

        <p className="mt-10 text-[11px] text-rail-text-2 lg:absolute lg:bottom-12 lg:left-14 lg:mt-0">
          Each academy sees only its own records.
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <h2 className="display">Sign in</h2>
          <p className="label mt-1.5">Use the account your academy set up for you.</p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="login-email" className="label mb-1.5 block font-semibold text-ink">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="field"
                placeholder="you@academy.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="label mb-1.5 block font-semibold text-ink">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field"
                placeholder="Your password"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-ctl border border-kumkum-line bg-kumkum-tint px-3 py-2.5 text-[13px] text-kumkum"
              >
                <span className="material-symbols-outlined mt-px shrink-0 text-[18px]" aria-hidden="true">error</span>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
