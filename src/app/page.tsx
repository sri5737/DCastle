'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      const response = await fetch('/api/auth/session');
      if (!response.ok) return;

      const session = await response.json();
      if (!session.authenticated) return;

      if (session.role === 'owner') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/submit');
      }
    }
    checkSession();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-sm">
        <h1 className="text-3xl font-bold">Deekshana Castle</h1>
        <p className="text-muted-foreground">
          Daily food preference management for PG residents
        </p>

        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium text-center hover:bg-primary/90"
          >
            Hosteler Login
          </Link>
          <Link
            href="/admin/login"
            className="block w-full py-2 px-4 bg-secondary text-secondary-foreground rounded-md text-sm font-medium text-center hover:bg-secondary/80"
          >
            Owner Login
          </Link>
        </div>
      </div>
    </div>
  );
}
