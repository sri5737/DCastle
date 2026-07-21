'use client';

import { useState } from 'react';
import type { Bill } from './bill-list';

interface BillDetailModalProps {
  bill: Bill | null;
  onClose: () => void;
  onTransmitted: (billId: string) => void;
}

export function BillDetailModal({ bill, onClose, onTransmitted }: BillDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** T119b: collapsed/expanded breakdown mode */
  const [expanded, setExpanded] = useState(true);

  if (!bill) return null;

  const mealCharges = bill.meal_charges ?? { breakfast: 0, lunch: 0, dinner: 0 };

  async function handleTransmit() {
    if (!bill) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/billing/bills/${bill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transmit' }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to transmit bill');
        return;
      }
      onTransmitted(bill.id);
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
      aria-label={`Bill detail for ${bill.hostelers?.name ?? 'hosteler'}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{bill.hostelers?.name ?? 'Hosteler'}</h2>
            <p className="text-sm text-muted-foreground">
              {bill.month?.slice(0, 7)} · Room {bill.hostelers?.rooms?.room_number ?? '—'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-muted"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* T119b: Expand/collapse toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mb-3 text-sm text-primary underline"
          aria-expanded={expanded}
        >
          {expanded ? 'Collapse breakdown' : 'Expand breakdown'}
        </button>

        {/* Breakdown */}
        {expanded && (
          <div className="mb-4 space-y-2 rounded-md border p-3 text-sm">
            <div className="flex justify-between">
              <span>Room Rent Total</span>
              <span>₹{bill.room_rent_total.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2">
              <p className="mb-1 font-medium">Meal Charges</p>
              <div className="flex justify-between pl-2">
                <span>Breakfast</span>
                <span>₹{mealCharges.breakfast.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pl-2">
                <span>Lunch</span>
                <span>₹{mealCharges.lunch.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pl-2">
                <span>Dinner</span>
                <span>₹{mealCharges.dinner.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Grand Total</span>
              <span>₹{bill.grand_total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Status info */}
        <div className="mb-4 text-sm text-muted-foreground">
          <p>Status: {bill.status === 'transmitted' ? 'Transmitted' : 'Generated, Awaiting Transmission'}</p>
          {bill.transmitted_at && (
            <p>Transmitted: {new Date(bill.transmitted_at).toLocaleString()}</p>
          )}
        </div>

        {error && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border px-4 py-2 text-sm hover:bg-muted"
          >
            Close
          </button>
          {bill.status === 'generated' && (
            <button
              type="button"
              onClick={handleTransmit}
              disabled={loading}
              className="min-h-[44px] rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {loading ? 'Transmitting…' : 'Transmit Bill'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
