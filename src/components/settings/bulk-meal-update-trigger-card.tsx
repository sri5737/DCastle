'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  summaryText: string;
  loading: boolean;
  onOpen: () => void;
};

export function BulkMealUpdateTriggerCard({ summaryText, loading, onOpen }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Bulk Meal Update</CardTitle>
        <p className="text-sm text-muted-foreground">
          Run mess closure or holiday updates only when needed.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
          {loading ? 'Loading last run summary...' : summaryText}
        </div>
        <Button type="button" onClick={onOpen} className="min-h-11 w-full sm:w-auto">
          Open Bulk Update
        </Button>
      </CardContent>
    </Card>
  );
}
