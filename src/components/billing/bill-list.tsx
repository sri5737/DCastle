'use client';

import { useState } from 'react';

export interface Bill {
  id: string;
  hosteler_id: string;
  month: string;
  status: 'generated' | 'transmitted';
  room_rent_total: number;
  meal_charges: { breakfast: number; lunch: number; dinner: number };
  grand_total: number;
  generated_at: string;
  transmitted_at: string | null;
  hostelers?: {
    name: string;
    room_id: string | null;
    rooms?: { room_number: string } | null;
  } | null;
}

interface BillListProps {
  bills: Bill[];
  onBillClick: (bill: Bill) => void;
  /** T119b: status filter */
  statusFilter?: 'all' | 'generated' | 'transmitted';
  onStatusFilterChange?: (value: 'all' | 'generated' | 'transmitted') => void;
  /** T119b: hosteler search */
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

export function BillList({
  bills,
  onBillClick,
  statusFilter = 'all',
  onStatusFilterChange,
  searchQuery = '',
  onSearchChange,
}: BillListProps) {
  const filtered = bills.filter((b) => {
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const hostelerName = b.hostelers?.name?.toLowerCase() ?? '';
    const matchSearch = !searchQuery || hostelerName.includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* T119b: Filter controls */}
      <div className="flex flex-wrap gap-3">
        {onStatusFilterChange && (
          <div>
            <label className="mr-2 text-sm font-medium" htmlFor="status-filter">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) =>
                onStatusFilterChange(e.target.value as 'all' | 'generated' | 'transmitted')
              }
              className="rounded border px-2 py-1 text-sm"
            >
              <option value="all">All</option>
              <option value="generated">Generated</option>
              <option value="transmitted">Transmitted</option>
            </select>
          </div>
        )}
        {onSearchChange && (
          <div className="flex-1 min-w-[180px]">
            <label className="sr-only" htmlFor="hosteler-search">
              Search hosteler
            </label>
            <input
              id="hosteler-search"
              type="search"
              placeholder="Search hosteler…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded border px-3 py-1 text-sm"
            />
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bills found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left font-medium">
                <th className="pb-2 pr-4">Hosteler</th>
                <th className="pb-2 pr-4">Room</th>
                <th className="pb-2 pr-4">Month</th>
                <th className="pb-2 pr-4">Total</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Generated</th>
                <th className="pb-2">Transmitted</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((bill) => (
                <tr
                  key={bill.id}
                  className="cursor-pointer border-b hover:bg-muted/50"
                  onClick={() => onBillClick(bill)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onBillClick(bill)}
                  aria-label={`View bill for ${bill.hostelers?.name ?? 'hosteler'}`}
                >
                  <td className="py-2 pr-4">{bill.hostelers?.name ?? '—'}</td>
                  <td className="py-2 pr-4">{bill.hostelers?.rooms?.room_number ?? '—'}</td>
                  <td className="py-2 pr-4">{bill.month?.slice(0, 7)}</td>
                  <td className="py-2 pr-4">₹{bill.grand_total.toFixed(2)}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={
                        bill.status === 'transmitted'
                          ? 'rounded bg-green-100 px-2 py-0.5 text-xs text-green-700'
                          : 'rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700'
                      }
                    >
                      {bill.status === 'transmitted' ? 'Transmitted' : 'Generated, Awaiting Transmission'}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-xs text-muted-foreground">
                    {bill.generated_at ? new Date(bill.generated_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {bill.transmitted_at ? new Date(bill.transmitted_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
