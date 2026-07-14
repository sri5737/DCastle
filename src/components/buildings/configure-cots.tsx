'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type CotConfigurationType = 'bunker' | 'normal';

interface ConfigureCotsProps {
  roomId: string;
  hasCots: boolean;
  currentMode?: CotConfigurationType | null;
  onConfigured: () => void;
}

function toModeLabel(mode: CotConfigurationType | null | undefined) {
  if (mode === 'bunker') return 'Bunker';
  if (mode === 'normal') return 'Normal';
  return 'Unknown';
}

export function ConfigureCots({ roomId, hasCots, currentMode = null, onConfigured }: ConfigureCotsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cotConfigurationType, setCotConfigurationType] = useState<CotConfigurationType | ''>('');
  const [resetConfirmed, setResetConfirmed] = useState(false);

  useEffect(() => {
    // Reset transient UI state whenever room context changes or latest room data is refreshed.
    setError('');
    setCotConfigurationType('');
    setResetConfirmed(false);
  }, [roomId, hasCots, currentMode]);

  async function handleConfigure() {
    if (!cotConfigurationType) {
      setError('Cot configuration type is required');
      return;
    }

    setError('');
    setLoading(true);

    const isReset = hasCots;
    if (isReset && !resetConfirmed) {
      setError('Confirm that you understand this destructive reset action');
      setLoading(false);
      return;
    }

    const res = await fetch(`/api/admin/rooms/${roomId}/cots`, {
      method: isReset ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        isReset
          ? { action: 'reset', cot_configuration_type: cotConfigurationType }
          : { cot_configuration_type: cotConfigurationType },
      ),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Failed to configure cots');
      return;
    }

    setError('');
    setCotConfigurationType('');
    setResetConfirmed(false);
    onConfigured();
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium" htmlFor={`cot-config-type-${roomId}`}>
        Cot configuration type
      </label>
      <select
        id={`cot-config-type-${roomId}`}
        value={cotConfigurationType}
        onChange={(event) => {
          setCotConfigurationType(event.target.value as CotConfigurationType | '');
          if (error) {
            setError('');
          }
        }}
        required
        disabled={loading}
        className="min-h-[44px] w-full rounded-md border bg-background px-3 text-sm"
      >
        <option value="">Select type</option>
        <option value="bunker">Bunker</option>
        <option value="normal">Normal</option>
      </select>

      {hasCots && cotConfigurationType ? (
        <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">Destructive action: reset existing cots</p>
          <p>
            Current mode: <strong>{toModeLabel(currentMode)}</strong>
          </p>
          <p>
            Target mode: <strong>{toModeLabel(cotConfigurationType)}</strong>
          </p>
          <p className="text-xs text-muted-foreground">
            Guardrail: reset is blocked if any cot in this room is assigned to an active hosteler.
          </p>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={resetConfirmed}
              onChange={(event) => {
                setResetConfirmed(event.target.checked);
                if (error) {
                  setError('');
                }
              }}
              disabled={loading}
            />
            <span>I understand this will regenerate cot inventory for this room.</span>
          </label>
        </div>
      ) : null}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="min-h-[44px]"
        disabled={loading || !cotConfigurationType || (hasCots && !resetConfirmed)}
        onClick={handleConfigure}
      >
        {loading ? (hasCots ? 'Resetting...' : 'Configuring...') : hasCots ? 'Reset Cots' : 'Configure Cots'}
      </Button>
      {hasCots ? (
        <p className="text-xs text-muted-foreground">
          Reset regenerates cots for this room and is allowed only when no active hosteler assignment exists.
        </p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
