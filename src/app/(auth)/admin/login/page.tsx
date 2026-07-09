'use client';

import { useEffect, useState } from 'react';
import { emitUiDiagnostic } from '@/lib/diagnostics/events';

export default function AdminLoginPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError('');
		setLoading(true);
    emitUiDiagnostic({ page: '/admin/login', action: 'auth.owner.login', state: 'submit-start', metadata: { email } });

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
			});

      const data = await response.json();

      if (response.ok) {
        emitUiDiagnostic({ page: '/admin/login', action: 'auth.owner.login', state: 'navigation-intent', metadata: { redirectTo: data.redirectTo } });
        window.location.href = data.redirectTo || '/admin/dashboard';
				return;
			}

      emitUiDiagnostic({ page: '/admin/login', action: 'auth.owner.login', state: 'submit-failure', metadata: { status: response.status } });
      setError(data.error || 'Login failed. Please check your credentials.');
		} catch {
			emitUiDiagnostic({ page: '/admin/login', action: 'auth.owner.login', state: 'submit-failure', metadata: { reason: 'network' } });
			setError('An unexpected network error occurred. Please try again.');
		} finally {
			setLoading(false);
		}
	}

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Owner Login</h1>
          <p className="text-muted-foreground mt-2">
            Sign in to manage Deekshana Castle
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="owner@example.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !hydrated}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
