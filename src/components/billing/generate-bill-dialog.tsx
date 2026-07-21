'use client';

import { useState } from 'react';

interface GenerateBillDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerated: () => void;
}

export function GenerateBillDialog({ open, onClose, onGenerated }: GenerateBillDialogProps) {
  const [scope, setScope] = useState<'all' | 'building' | 'hosteler'>('all');
  const [scopeId, setScopeId] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/billing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          scope_id: scope !== 'all' ? scopeId : undefined,
          month,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to generate bills');
        return;
      }
      onGenerated();
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Generate Bills"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Generate Bills</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Scope selection */}
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="scope-select">
              Scope
            </label>
            <select
              id="scope-select"
              value={scope}
              onChange={(e) => setScope(e.target.value as typeof scope)}
              className="w-full rounded border px-3 py-2 text-sm"
            >
              <option value="all">All Hostelers</option>
              <option value="building">Specific Building</option>
              <option value="hosteler">Individual Hosteler</option>
            </select>
          </div>

          {scope !== 'all' && (
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="scope-id-input">
                {scope === 'building' ? 'Building ID' : 'Hosteler ID'}
              </label>
              <input
                id="scope-id-input"
                type="text"
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                required
                placeholder={`Enter ${scope} ID`}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          )}

          {/* Month picker */}
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="month-input">
              Month
            </label>
            <input
              id="month-input"
              type="month"
              value={month.slice(0, 7)}
              onChange={(e) => setMonth(`${e.target.value}-01`)}
              required
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {loading ? 'Generating…' : 'Generate Bills'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
