'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
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

interface HostelerItem {
  id: string;
  name: string;
  phone: string;
  room_number: string;
  status: 'active' | 'pending' | 'inactive';
  activated_at: string | null;
  created_at: string;
}

interface Counts {
  active: number;
  pending: number;
  inactive: number;
}

export default function HostelerManagementPage() {
  const [hostelers, setHostelers] = useState<HostelerItem[]>([]);
  const [counts, setCounts] = useState<Counts>({ active: 0, pending: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  // Add hosteler form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  // Deactivation confirmation dialog
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<HostelerItem | null>(null);
  const [futurePreferenceCount, setFuturePreferenceCount] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchHostelers = useCallback(async (status?: string) => {
    const url = status ? `/api/hostelers?status=${status}` : '/api/hostelers';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setHostelers(data.hostelers);
      setCounts(data.counts);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHostelers(activeTab);
  }, [activeTab, fetchHostelers]);

  async function handleAddHosteler(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    setAdding(true);

    const res = await fetch('/api/hostelers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), phone: phone.trim(), room_number: roomNumber.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      setAddError(data.error || 'Failed to add hosteler');
      setAdding(false);
      return;
    }

    setInviteUrl(data.invite.invite_url);
    setShowInviteDialog(true);
    setName('');
    setPhone('');
    setRoomNumber('');
    setAdding(false);
    fetchHostelers(activeTab);
  }

  async function handleDeactivate(hosteler: HostelerItem) {
    setActionLoading(hosteler.id);

    const res = await fetch(`/api/hostelers/${hosteler.id}`, {
      method: 'PATCH',
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

    fetchHostelers(activeTab);
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    setActionLoading(deactivateTarget.id);

    const res = await fetch(`/api/hostelers/${deactivateTarget.id}`, {
      method: 'PATCH',
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

    fetchHostelers(activeTab);
  }

  async function handleReactivate(hosteler: HostelerItem) {
    setActionLoading(hosteler.id);

    const res = await fetch(`/api/hostelers/${hosteler.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reactivate' }),
    });

    setActionLoading(null);

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to reactivate');
      return;
    }

    fetchHostelers(activeTab);
  }

  async function handleResetInvite(hosteler: HostelerItem) {
    setActionLoading(hosteler.id);

    const res = await fetch(`/api/hostelers/${hosteler.id}/reset-invite`, {
      method: 'POST',
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
          <form onSubmit={handleAddHosteler} className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={100}
              aria-label="Hosteler name"
            />
            <Input
              placeholder="Phone (10 digits)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              pattern="[6-9]\d{9}"
              maxLength={10}
              aria-label="Phone number"
            />
            <Input
              placeholder="Room No."
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              required
              maxLength={10}
              aria-label="Room number"
            />
            <Button type="submit" disabled={adding}>
              {adding ? 'Adding...' : 'Add Hosteler'}
            </Button>
          </form>
          {addError && <p className="text-sm text-destructive mt-2">{addError}</p>}
        </CardContent>
      </Card>

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">Active ({counts.active})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({counts.inactive})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <HostelerTable
            hostelers={filteredHostelers}
            actions={(h) => (
              <div className="flex gap-2">
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
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="pending">
          <HostelerTable
            hostelers={filteredHostelers}
            actions={(h) => (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResetInvite(h)}
                disabled={actionLoading === h.id}
              >
                Reset Invite
              </Button>
            )}
          />
        </TabsContent>

        <TabsContent value="inactive">
          <HostelerTable
            hostelers={filteredHostelers}
            actions={(h) => (
              <div className="flex gap-2">
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
    <div className="border rounded-md">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium">Name</th>
            <th className="text-left p-3 font-medium">Phone</th>
            <th className="text-left p-3 font-medium">Room</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-left p-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {hostelers.map((h) => (
            <tr key={h.id} className="border-b last:border-b-0">
              <td className="p-3">{h.name}</td>
              <td className="p-3">{h.phone}</td>
              <td className="p-3">{h.room_number}</td>
              <td className="p-3">
                <Badge
                  variant={
                    h.status === 'active'
                      ? 'default'
                      : h.status === 'pending'
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {h.status}
                </Badge>
              </td>
              <td className="p-3">{actions(h)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
