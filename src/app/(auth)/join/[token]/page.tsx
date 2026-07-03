'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';

type TokenStatus = 'loading' | 'valid' | 'expired' | 'used' | 'invalid';

interface HostelerInfo {
  name: string;
  room_number: string;
}

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>('loading');
  const [hostelerInfo, setHostelerInfo] = useState<HostelerInfo | null>(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<'choice' | 'pin' | 'google'>('choice');

  useEffect(() => {
    validateToken();
  }, [token]);

  async function validateToken() {
    try {
      const res = await fetch(`/api/invite/validate?token=${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'Token already used') {
          setTokenStatus('used');
        } else if (data.error === 'Invalid or expired invite token') {
          setTokenStatus('expired');
        } else {
          setTokenStatus('invalid');
        }
        return;
      }

      setTokenStatus('valid');
      setHostelerInfo({ name: data.hosteler.name, room_number: data.hosteler.room_number });
    } catch {
      setTokenStatus('invalid');
    }
  }

  async function handlePinActivation() {
    setError('');

    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/invite/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, method: 'pin', pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Activation failed');
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
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?invite_token=${encodeURIComponent(token)}`,
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

  if (tokenStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto mb-4" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
          </div>
        </Card>
      </div>
    );
  }

  if (tokenStatus === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="text-red-500 text-4xl mb-4">⏰</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invite Link Expired</h1>
          <p className="text-gray-600">
            This invite link has expired. Please ask your PG owner to generate a new one.
          </p>
        </Card>
      </div>
    );
  }

  if (tokenStatus === 'used') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="text-yellow-500 text-4xl mb-4">✓</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Already Activated</h1>
          <p className="text-gray-600 mb-4">
            This invite link has already been used. If you&apos;ve already activated your account, you can log in.
          </p>
          <Button onClick={() => router.push('/login')} className="w-full">
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  if (tokenStatus === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="text-red-500 text-4xl mb-4">✕</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invite Link</h1>
          <p className="text-gray-600">
            This invite link is not valid. Please check the link or contact your PG owner.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to DCastle!</h1>
          {hostelerInfo && (
            <p className="text-gray-600 mt-2">
              Hello <span className="font-medium">{hostelerInfo.name}</span>, Room {hostelerInfo.room_number}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            Activate your account to manage your food preferences
          </p>
        </div>

        {method === 'choice' && (
          <div className="space-y-3">
            <Button
              onClick={handleGoogleSignIn}
              variant="outline"
              className="w-full h-12 text-base"
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>

            <Button
              onClick={() => setMethod('pin')}
              className="w-full h-12 text-base"
              disabled={loading}
            >
              Set up 4-digit PIN
            </Button>
          </div>
        )}

        {method === 'pin' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Create a 4-digit PIN
              </label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                placeholder="Enter 4-digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm PIN
              </label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                placeholder="Re-enter PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button
              onClick={handlePinActivation}
              className="w-full h-12"
              disabled={loading}
            >
              {loading ? 'Activating...' : 'Activate Account'}
            </Button>

            <Button
              variant="ghost"
              onClick={() => { setMethod('choice'); setError(''); }}
              className="w-full"
            >
              ← Back to options
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
