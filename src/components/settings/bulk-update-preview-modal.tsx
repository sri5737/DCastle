'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type MealsPayload = {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
};

type PreviewPayload = {
  total_hostelers_affected: number;
  total_date_rows_affected: number;
  has_transmitted_bills: boolean;
  transmitted_month_labels: string[];
};

type ConfirmationRequest = {
  reason: string;
};

type Props = {
  open: boolean;
  scopeLabel: string;
  dateLabel: string;
  meals: MealsPayload;
  preview: PreviewPayload | null;
  applying: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (request: ConfirmationRequest) => Promise<void>;
};

function formatMeals(meals: MealsPayload) {
  return `B ${meals.breakfast ? 'ON' : 'OFF'} | L ${meals.lunch ? 'ON' : 'OFF'} | D ${meals.dinner ? 'ON' : 'OFF'}`;
}

export function BulkUpdatePreviewModal({
  open,
  scopeLabel,
  dateLabel,
  meals,
  preview,
  applying,
  onOpenChange,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState('');
  const reasonValid = useMemo(() => reason.trim().length > 0, [reason]);

  async function handleConfirm() {
    if (!reasonValid) return;
    await onConfirm({ reason: reason.trim() });
    setReason('');
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setReason('');
        onOpenChange(next);
      }}
    >
      <DialogContent className="w-[calc(100vw-1rem)] max-w-xl overflow-x-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Confirm Bulk Meal Update</DialogTitle>
          <DialogDescription>
            Review summary and provide a reason before applying this bulk update.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-md border bg-muted/30 p-3">
            <p><span className="font-medium">Scope:</span> {scopeLabel}</p>
            <p><span className="font-medium">Dates:</span> {dateLabel}</p>
            <p><span className="font-medium">Meals:</span> {formatMeals(meals)}</p>
            <p><span className="font-medium">Affected Hostelers:</span> {preview?.total_hostelers_affected ?? 0}</p>
            <p><span className="font-medium">Affected Date Rows:</span> {preview?.total_date_rows_affected ?? 0}</p>
          </div>

          {preview?.has_transmitted_bills ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-800">
              <p className="font-medium">Transmitted bills found.</p>
              <p>
                Regenerate and retransmit required to publish updates.
                {preview.transmitted_month_labels.length > 0
                  ? ` Impacted month(s): ${preview.transmitted_month_labels.join(', ')}.`
                  : ''}
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="bulk-adjust-reason" className="font-medium">
              Reason (required)
            </label>
            <textarea
              id="bulk-adjust-reason"
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded-md border bg-background p-3 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Festival holiday closure"
            />
            {!reasonValid ? <p className="text-xs text-destructive">Reason is required to confirm.</p> : null}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={applying || !reasonValid}>
            {applying ? 'Applying...' : 'Confirm and Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
