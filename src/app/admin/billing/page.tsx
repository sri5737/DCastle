'use client';

import { useState, useEffect, useCallback } from 'react';
import { BillList, type Bill } from '@/components/billing/bill-list';
import { BillDetailModal } from '@/components/billing/bill-detail-modal';
import { GenerateBillDialog } from '@/components/billing/generate-bill-dialog';

export default function AdminBillingPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'generated' | 'transmitted'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/billing/bills');
      if (!res.ok) {
        setError('Failed to load bills');
        return;
      }
      const data = await res.json();
      setBills(data.bills ?? []);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  function handleTransmitted(billId: string) {
    setBills((prev) =>
      prev.map((b) =>
        b.id === billId
          ? { ...b, status: 'transmitted', transmitted_at: new Date().toISOString() }
          : b
      )
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Billing</h1>
        <button
          onClick={() => setShowGenerateDialog(true)}
          className="min-h-[44px] rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Generate Bill
        </button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading bills…</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {!loading && !error && (
        <BillList
          bills={bills}
          onBillClick={setSelectedBill}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      )}

      {showGenerateDialog && (
        <GenerateBillDialog
          open={showGenerateDialog}
          onClose={() => setShowGenerateDialog(false)}
          onGenerated={fetchBills}
        />
      )}

      {selectedBill && (
        <BillDetailModal
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
          onTransmitted={handleTransmitted}
        />
      )}
    </main>
  );
}
