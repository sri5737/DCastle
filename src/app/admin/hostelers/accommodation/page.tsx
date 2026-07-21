import { AccommodationAssignmentPanel } from '@/components/hostelers/accommodation-assignment-panel';

export default function HostelerAccommodationPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Accommodation Assignment</h1>
        <p className="text-sm text-muted-foreground">
          Assign or reassign building, room, and cot after registration. Hostelers can remain unassigned until this step.
        </p>
      </div>
      <AccommodationAssignmentPanel />
    </div>
  );
}
