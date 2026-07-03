'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function HostelerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    document.cookie = 'sb-access-token=; path=/; max-age=0';
    document.cookie = 'sb-refresh-token=; path=/; max-age=0';
    router.replace('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/submit" className="font-bold text-lg">
            DCastle
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/submit" className="hover:text-primary">
              Submit
            </Link>
            <Link href="/my-history" className="hover:text-primary">
              History
            </Link>
            <Link href="/my-bill" className="hover:text-primary">
              Bill
            </Link>
            <button
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-md mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
