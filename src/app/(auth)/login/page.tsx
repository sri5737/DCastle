'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle error params from Google OAuth callback
  const callbackError = searchParams.get('error');
  const errorMessage = getCallbackErrorMessage(callbackError);

  async function handlePinLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    setLoading(true);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) {
        setError('Failed to initiate Google sign-in');
        setLoading(false);
      }
      // Redirects to Google — loading stays true
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-sm text-gray-500 mt-1">
            Sign in to manage your food preferences
          </p>
        </div>

        {/* Error from Google OAuth callback */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        {/* Error from form actions */}
        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Google Sign-In */}
        <Button
          onClick={handleGoogleSignIn}
          variant="outline"
          className="w-full h-12 text-base mb-4"
          disabled={loading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </Button>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Or sign in with PIN</span>
          </div>
        </div>

        {/* Phone + PIN Form */}
        <form onSubmit={handlePinLogin} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={10}
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
              4-Digit PIN
            </label>
            <Input
              id="pin"
              type="password"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={4}
              inputMode="numeric"
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function getCallbackErrorMessage(error: string | null): string | null {
  switch (error) {
    case 'not_registered':
      return 'This Google account is not registered. Please ask your PG owner for an invite link to activate your account.';
    case 'inactive':
      return 'Your account is inactive. Please contact your PG owner.';
    case 'auth_failed':
      return 'Authentication failed. Please try again.';
    case 'no_code':
      return 'Authentication failed. Please try again.';
    default:
      return null;
  }
}
