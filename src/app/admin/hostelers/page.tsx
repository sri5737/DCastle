'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { emitUiDiagnostic } from '@/lib/diagnostics/events';

interface HostelerItem {
  id: string;
  name: string;
  phone: string;
  room_number: string;
  status: 'active' | 'pending' | 'inactive' | 'deleted';
  activated_at: string | null;
  deleted_at: string | null;
  deleted_from_status: 'pending' | 'active' | null;
  deletion_effective_date: string | null;
  canceled_future_preference_count?: number;
  created_at: string;
}

interface Counts {
  active: number;
  pending: number;
  inactive: number;
  deleted: number;
}

interface DeletePreview {
  deletion_effective_date: string;
  future_preference_count: number;
  message: string;
}

interface AuditResponse {
  hosteler: HostelerItem;
  audit: {
    preserved_history_through: string;
    canceled_future_preferences: Array<{
      id: string;
      date: string;
      breakfast: boolean;
      lunch: boolean;
      dinner: boolean;
      canceled_at: string | null;
      cancellation_reason: string | null;
    }>;
  };
}

function applyHostelerUpsert(list: HostelerItem[], next: HostelerItem) {
  const existingIndex = list.findIndex((hosteler) => hosteler.id === next.id);
  if (existingIndex === -1) {
    return [next, ...list];
  }

  return list.map((hosteler) => (hosteler.id === next.id ? { ...hosteler, ...next } : hosteler));
}

function recalculateCounts(list: HostelerItem[]): Counts {
  return list.reduce(
    (acc, hosteler) => {
      acc[hosteler.status] += 1;
      return acc;
    },
    { active: 0, pending: 0, inactive: 0, deleted: 0 } as Counts
  );
}

export default function HostelerManagementPage() {
  const [hostelers, setHostelers] = useState<HostelerItem[]>([]);
  const [allHostelers, setAllHostelers] = useState<HostelerItem[]>([]);
  const [counts, setCounts] = useState<Counts>({ active: 0, pending: 0, inactive: 0, deleted: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  // Add hosteler form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [addError, setAddError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [adding, setAdding] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  // Deactivation confirmation dialog
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<HostelerItem | null>(null);
  const [futurePreferenceCount, setFuturePreferenceCount] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HostelerItem | null>(null);
  const [deletePreview, setDeletePreview] = useState<DeletePreview | null>(null);
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);

  const fetchHostelers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/hostelers', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setAllHostelers(data.hostelers);
      setCounts(data.counts);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHostelers();
  }, [fetchHostelers]);

  useEffect(() => {
    setHostelers(allHostelers.filter((hosteler) => hosteler.status === activeTab));
  }, [activeTab, allHostelers]);

  async function handleAddHosteler(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    setPhoneError('');
    setAdding(true);
    emitUiDiagnostic({ page: '/admin/hostelers', action: 'hosteler.create', state: 'submit-start', metadata: { phone } });

    const res = await fetch('/api/hostelers', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), phone: phone.trim(), room_number: roomNumber.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      emitUiDiagnostic({ page: '/admin/hostelers', action: 'hosteler.create', state: 'submit-failure', metadata: { status: res.status } });
      if (res.status === 409 && data.error?.code === 'phone_already_registered') {
        setPhoneError(data.error.message);
      } else {
        setAddError(data.error?.message || data.error || 'Failed to add hosteler');
      }
      setAdding(false);
      return;
    }

    setInviteUrl(data.invite.invite_url);
  emitUiDiagnostic({ page: '/admin/hostelers', action: 'hosteler.create', state: 'submit-success', metadata: { hostelerId: data.hosteler.id } });
    setShowInviteDialog(true);

    const createdHosteler: HostelerItem = {
      ...data.hosteler,
      activated_at: data.hosteler.activated_at ?? null,
      deleted_at: null,
      deleted_from_status: null,
      deletion_effective_date: null,
      canceled_future_preference_count: 0,
    };
    const nextAllHostelers = applyHostelerUpsert(allHostelers, createdHosteler);
    setAllHostelers(nextAllHostelers);
    setCounts(recalculateCounts(nextAllHostelers));
    setName('');
    setPhone('');
    setRoomNumber('');
    setPhoneError('');
    setAdding(false);
    fetchHostelers();
  }

  async function handleDeactivate(hosteler: HostelerItem) {
    setActionLoading(hosteler.id);
    emitUiDiagnostic({ page: '/admin/hostelers', action: 'hosteler.deactivate', state: 'click', metadata: { hostelerId: hosteler.id } });

    const res = await fetch(`/api/hostelers/${hosteler.id}`, {
      method: 'PATCH',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deactivate' }),
    });

    const data = await res.json();
    setActionLoading(null);

    if (data.requires_confirmation) {
      setDeactivateTarget(hosteler);
      setFuturePreferenceCount(data.future_preference_count);
      setShowDeactivateDialog(true);
      return;
    }

    if (!res.ok) {
      alert(data.error || 'Failed to deactivate');
      return;
    }

    const updatedHosteler: HostelerItem = {
      ...hosteler,
      status: 'inactive',
    };
    const nextAllHostelers = applyHostelerUpsert(allHostelers, updatedHosteler);
    setAllHostelers(nextAllHostelers);
    setCounts(recalculateCounts(nextAllHostelers));
    fetchHostelers();
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    setActionLoading(deactivateTarget.id);

    const res = await fetch(`/api/hostelers/${deactivateTarget.id}`, {
      method: 'PATCH',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deactivate', confirmed: true }),
    });

    setActionLoading(null);
    setShowDeactivateDialog(false);
    setDeactivateTarget(null);

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to deactivate');
      return;
    }

    const updatedHosteler: HostelerItem = {
      ...deactivateTarget,
      status: 'inactive',
    };
    const nextAllHostelers = applyHostelerUpsert(allHostelers, updatedHosteler);
    setAllHostelers(nextAllHostelers);
    setCounts(recalculateCounts(nextAllHostelers));
    fetchHostelers();
  }

  async function handleReactivate(hosteler: HostelerItem) {
    setActionLoading(hosteler.id);
    emitUiDiagnostic({ page: '/admin/hostelers', action: 'hosteler.reactivate', state: 'click', metadata: { hostelerId: hosteler.id } });

    const res = await fetch(`/api/hostelers/${hosteler.id}`, {
      method: 'PATCH',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reactivate' }),
    });

    setActionLoading(null);

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to reactivate');
      return;
    }

    const updatedHosteler: HostelerItem = {
      ...hosteler,
      status: 'active',
    };
    const nextAllHostelers = applyHostelerUpsert(allHostelers, updatedHosteler);
    setAllHostelers(nextAllHostelers);
    setCounts(recalculateCounts(nextAllHostelers));
    fetchHostelers();
  }

  async function handleResetInvite(hosteler: HostelerItem) {
    setActionLoading(hosteler.id);
    emitUiDiagnostic({ page: '/admin/hostelers', action: 'hosteler.reset-invite', state: 'click', metadata: { hostelerId: hosteler.id } });

    const res = await fetch(`/api/hostelers/${hosteler.id}/reset-invite`, {
      method: 'POST',
      cache: 'no-store',
    });

    const data = await res.json();
    setActionLoading(null);

    if (!res.ok) {
      alert(data.error || 'Failed to reset invite');
      return;
    }

    setInviteUrl(data.invite_url);
    setShowInviteDialog(true);
  }

  async function handleDelete(hosteler: HostelerItem) {
    emitUiDiagnostic({ page: '/admin/hostelers', action: 'hosteler.delete', state: 'click', metadata: { hostelerId: hosteler.id, status: hosteler.status } });
    if (hosteler.status === 'pending') {
      setDeleteTarget(hosteler);
      setDeletePreview(null);
      setShowDeleteDialog(true);
      return;
    }

    setActionLoading(hosteler.id);
    const res = await fetch(`/api/hostelers/${hosteler.id}`, {
      method: 'PATCH',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete' }),
    });

    const data = await res.json();
    setActionLoading(null);

    if (!res.ok && !data.requires_confirmation) {
      alert(data.error || 'Failed to prepare deletion');
      return;
    }

    setDeleteTarget(hosteler);
    setDeletePreview({
      deletion_effective_date: data.deletion_effective_date,
      future_preference_count: data.future_preference_count,
      message: data.message,
    });
    setShowDeleteDialog(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    const target = deleteTarget;
    setShowDeleteDialog(false);
    setActionLoading(target.id);
    const res = await fetch(`/api/hostelers/${target.id}`, {
      method: 'PATCH',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', confirmed: target.status === 'active' }),
    });

    const data = await res.json();

    if (!res.ok) {
      setActionLoading(null);
      alert(data.error || 'Failed to delete hosteler');
      setShowDeleteDialog(true);
      return;
    }

    // For pending hostelers: hard delete (no row created), so remove from list immediately
    if (target.status === 'pending') {
      const nextAllHostelers = allHostelers.filter((h) => h.id !== target.id);
      setAllHostelers(nextAllHostelers);
      setCounts(recalculateCounts(nextAllHostelers));
    } else {
      // For active hostelers: soft delete (archived), so update status to deleted
      const updatedHosteler: HostelerItem = {
        ...target,
        status: 'deleted',
        deleted_from_status: 'active',
        deleted_at: data.hosteler.deleted_at,
        deletion_effective_date: data.hosteler.deletion_effective_date,
        canceled_future_preference_count: data.canceled_future_preferences,
      };
      const nextAllHostelers = applyHostelerUpsert(allHostelers, updatedHosteler);
      setAllHostelers(nextAllHostelers);
      setCounts(recalculateCounts(nextAllHostelers));
    }

    setActionLoading(null);
    setShowDeleteDialog(false);
    setDeleteTarget(null);
    setDeletePreview(null);
  }

  async function handleViewAudit(hosteler: HostelerItem) {
    setAuditLoading(true);
    setShowAuditDialog(true);

    const res = await fetch(`/api/hostelers/${hosteler.id}?view=audit`, { cache: 'no-store' });
    const data = await res.json();

    setAuditLoading(false);

    if (!res.ok) {
      alert(data.error || 'Failed to load deleted hosteler audit detail');
      setShowAuditDialog(false);
      return;
    }

    setAuditData(data);
  }

  async function copyInviteUrl() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      // Fallback for environments without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  const filteredHostelers = hostelers;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading hostelers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hosteler Management</h1>

      {/* Add Hosteler Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Hosteler</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddHosteler} className="flex flex-col gap-3 w-full">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Input
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={100}
                aria-label="Hosteler name"
                className="flex-1 min-w-0"
              />
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <Input
                  placeholder="Phone (10 digits)"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); if (phoneError) setPhoneError(''); }}
                  required
                  pattern="[6-9]\d{9}"
                  maxLength={10}
                  aria-label="Phone number"
                  aria-describedby={phoneError ? 'phone-error' : undefined}
                  aria-invalid={!!phoneError}
                  className="min-w-0"
                />
                {phoneError && (
                  <p id="phone-error" className="text-sm text-destructive" role="alert">{phoneError}</p>
                )}
              </div>
              <Input
                placeholder="Room No."
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                required
                maxLength={10}
                aria-label="Room number"
                className="flex-1 min-w-0"
              />
            </div>
            <Button type="submit" disabled={adding} className="w-full sm:w-auto">
              {adding ? 'Adding...' : 'Add Hosteler'}
            </Button>
          </form>
          {addError && <p className="text-sm text-destructive mt-2">{addError}</p>}
        </CardContent>
      </Card>

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
          <TabsTrigger value="active" className="w-full">Active ({counts.active})</TabsTrigger>
          <TabsTrigger value="pending" className="w-full">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="inactive" className="w-full">Inactive ({counts.inactive})</TabsTrigger>
          <TabsTrigger value="deleted" className="w-full">Deleted ({counts.deleted})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <HostelerTable
            hostelers={filteredHostelers}
            actions={(h) => (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeactivate(h)}
                  disabled={actionLoading === h.id}
                >
                  Deactivate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResetInvite(h)}
                  disabled={actionLoading === h.id}
                >
                  Reset Invite
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(h)}
                  disabled={actionLoading === h.id}
                >
                  Delete
                </Button>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="pending">
          <HostelerTable
            hostelers={filteredHostelers}
            actions={(h) => (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResetInvite(h)}
                  disabled={actionLoading === h.id}
                >
                  Reset Invite
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(h)}
                  disabled={actionLoading === h.id}
                >
                  Delete
                </Button>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="inactive">
          <HostelerTable
            hostelers={filteredHostelers}
            actions={(h) => (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReactivate(h)}
                  disabled={actionLoading === h.id}
                >
                  Reactivate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResetInvite(h)}
                  disabled={actionLoading === h.id}
                >
                  Reset Invite
                </Button>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="deleted">
          <HostelerTable
            hostelers={filteredHostelers}
            actions={(h) => (
              <Button variant="outline" size="sm" onClick={() => handleViewAudit(h)}>
                View Audit
              </Button>
            )}
          />
        </TabsContent>
      </Tabs>

      {/* Deactivation Confirmation Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deactivation</DialogTitle>
            <DialogDescription>
              {deactivateTarget?.name} has submitted food preferences for{' '}
              <strong>{futurePreferenceCount}</strong> future date
              {futurePreferenceCount !== 1 ? 's' : ''}. These will remain and be included in
              billing. Do you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeactivate}
              disabled={actionLoading === deactivateTarget?.id}
            >
              Confirm Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deleteTarget?.status === 'pending' ? 'Delete Pending Hosteler' : 'Delete Active Hosteler'}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?.status === 'pending'
                ? 'This hosteler will be permanently deleted. Their invite link will be invalidated immediately. No record of this hosteler will be retained. This cannot be undone.'
                : deletePreview?.message}
            </DialogDescription>
          </DialogHeader>
          {deleteTarget?.status === 'active' && deletePreview ? (
            <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
              <p>Deletion effective date: {deletePreview.deletion_effective_date}</p>
              <p>
                Future preferences to cancel: {deletePreview.future_preference_count}
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={actionLoading === deleteTarget?.id}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAuditDialog}
        onOpenChange={(open) => {
          setShowAuditDialog(open);
          if (!open) {
            setAuditData(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Deleted Hosteler Audit</DialogTitle>
            <DialogDescription>
              Deleted records are audit-only in v1 and cannot be restored.
            </DialogDescription>
          </DialogHeader>
          {auditLoading ? (
            <p className="text-sm text-muted-foreground">Loading audit detail...</p>
          ) : auditData ? (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                <p><strong>Name:</strong> {auditData.hosteler.name}</p>
                <p><strong>Room:</strong> {auditData.hosteler.room_number}</p>
                <p><strong>Phone:</strong> {auditData.hosteler.phone}</p>
                <p><strong>Deleted from:</strong> {auditData.hosteler.deleted_from_status}</p>
                <p><strong>Deleted at:</strong> {formatTimestamp(auditData.hosteler.deleted_at)}</p>
                <p><strong>Preserved through:</strong> {auditData.audit.preserved_history_through}</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Canceled Future Preferences</h3>
                {auditData.audit.canceled_future_preferences.length === 0 ? (
                  <p className="text-muted-foreground">
                    No canceled future preferences were recorded for this deleted hosteler.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {auditData.audit.canceled_future_preferences.map((preference) => (
                      <div key={preference.id} className="rounded-md border p-3">
                        <p className="font-medium">{preference.date}</p>
                        <p>
                          Meals: {formatMeals(preference)}
                        </p>
                        <p>
                          Canceled at: {formatTimestamp(preference.canceled_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuditDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Link Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Link Generated</DialogTitle>
            <DialogDescription>
              Share this link with the hosteler to activate their account. The link expires in 7 days.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input value={inviteUrl} readOnly aria-label="Invite URL" />
            <Button onClick={copyInviteUrl}>Copy</Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatTimestamp(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatMeals(preference: Pick<AuditResponse['audit']['canceled_future_preferences'][number], 'breakfast' | 'lunch' | 'dinner'>) {
  const meals = [];
  if (preference.breakfast) meals.push('Breakfast');
  if (preference.lunch) meals.push('Lunch');
  if (preference.dinner) meals.push('Dinner');
  return meals.length > 0 ? meals.join(', ') : 'None';
}

function statusBadgeVariant(status: HostelerItem['status']) {
  if (status === 'active') return 'default';
  if (status === 'pending') return 'secondary';
  if (status === 'deleted') return 'destructive';
  return 'outline';
}

function HostelerTable({
  hostelers,
  actions,
}: {
  hostelers: HostelerItem[];
  actions: (h: HostelerItem) => React.ReactNode;
}) {
  if (hostelers.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No hostelers in this category.
      </div>
    );
  }

  return (
    // Single table inside a horizontally contained region: readable on desktop
    // and, at the 375px Android baseline, scrolls within this region instead of
    // creating page-level horizontal overflow (SC-014). Rendered once so a
    // hosteler name never appears twice in the DOM.
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left font-medium">Name</th>
            <th className="p-3 text-left font-medium">Phone</th>
            <th className="p-3 text-left font-medium">Room</th>
            <th className="p-3 text-left font-medium">Status</th>
            <th className="p-3 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {hostelers.map((h) => (
            <tr key={h.id} className="border-b last:border-b-0">
              <td className="p-3">{h.name}</td>
              <td className="p-3">{h.phone}</td>
              <td className="p-3">{h.room_number}</td>
              <td className="p-3">
                <Badge variant={statusBadgeVariant(h.status)}>{h.status}</Badge>
                {h.status === 'deleted' ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    From {h.deleted_from_status} on {h.deletion_effective_date}
                  </div>
                ) : null}
              </td>
              <td className="p-3">{actions(h)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
