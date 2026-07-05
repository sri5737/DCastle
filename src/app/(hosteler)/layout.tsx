'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { UtensilsCrossed, History, Receipt, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const HOSTELER_NAV = [
  { href: '/submit', label: 'Submit', icon: UtensilsCrossed },
  { href: '/my-history', label: 'History', icon: History },
  { href: '/my-bill', label: 'Bill', icon: Receipt },
];

export default function HostelerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top app bar */}
      <header className="sticky top-0 z-40 border-b bg-card pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2 px-4 py-3">
          <Link href="/dashboard" className="truncate text-lg font-bold">
            DCastle
          </Link>

          {/* Inline nav on larger screens */}
          <nav className="hidden items-center gap-4 text-sm sm:flex">
            {HOSTELER_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'hover:text-primary',
                  isActive(item.href) ? 'font-semibold text-primary' : 'text-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Content: extra bottom padding on mobile to clear the bottom tab bar */}
      <main className="mx-auto max-w-md px-4 py-6 pb-24 sm:pb-6">{children}</main>

      {/* Bottom tab bar on mobile (app-like navigation) */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {HOSTELER_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-xs',
                  active ? 'font-semibold text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
