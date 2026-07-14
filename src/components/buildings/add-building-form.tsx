'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AddBuildingFormProps {
  onCreated: () => void;
}

export function AddBuildingForm({ onCreated }: AddBuildingFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const res = await fetch('/api/admin/buildings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || 'Failed to create building');
      return;
    }

    setName('');
    setDescription('');
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-3">
      <Input
        placeholder="Building name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={255}
        className="min-h-[44px]"
      />
      <Input
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="min-h-[44px]"
      />
      <Button type="submit" disabled={submitting} className="min-h-[44px]">
        {submitting ? 'Adding...' : 'Add Building'}
      </Button>
      {error ? <p className="text-sm text-destructive sm:col-span-3">{error}</p> : null}
    </form>
  );
}
