import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

// ── Test Data ──────────────────────────────────────────────────────────────
const generatedBill = {
  id: 'bill-1',
  hosteler_id: 'host-1',
  month: '2026-07-01',
  status: 'generated' as const,
  room_rent_total: 3000,
  meal_charges: { breakfast: 930, lunch: 1240, dinner: 0 },
  grand_total: 5170,
  generated_at: '2026-07-14T10:00:00Z',
  transmitted_at: null,
  hostelers: { name: 'John Doe', room_id: 'r-1', rooms: { room_number: '101' } },
};

const transmittedBill = {
  ...generatedBill,
  id: 'bill-2',
  status: 'transmitted' as const,
  transmitted_at: '2026-07-14T11:00:00Z',
};

// ── GenerateBillDialog ─────────────────────────────────────────────────────
describe('GenerateBillDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders scope selector and month input', async () => {
    const { GenerateBillDialog } = await import('../generate-bill-dialog');
    render(
      <GenerateBillDialog open onClose={vi.fn()} onGenerated={vi.fn()} />
    );
    expect(screen.getByLabelText(/scope/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/month/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate bills/i })).toBeInTheDocument();
  });

  it('shows scope_id input when scope is building', async () => {
    const { GenerateBillDialog } = await import('../generate-bill-dialog');
    render(
      <GenerateBillDialog open onClose={vi.fn()} onGenerated={vi.fn()} />
    );
    fireEvent.change(screen.getByLabelText(/scope/i), { target: { value: 'building' } });
    expect(screen.getByLabelText(/building id/i)).toBeInTheDocument();
  });

  it('shows scope_id input when scope is hosteler', async () => {
    const { GenerateBillDialog } = await import('../generate-bill-dialog');
    render(
      <GenerateBillDialog open onClose={vi.fn()} onGenerated={vi.fn()} />
    );
    fireEvent.change(screen.getByLabelText(/scope/i), { target: { value: 'hosteler' } });
    expect(screen.getByLabelText(/hosteler id/i)).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    const { GenerateBillDialog } = await import('../generate-bill-dialog');
    render(
      <GenerateBillDialog open onClose={onClose} onGenerated={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onGenerated and onClose on successful generation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ generated_count: 2, bills: [] }),
    });
    const onGenerated = vi.fn();
    const onClose = vi.fn();
    const { GenerateBillDialog } = await import('../generate-bill-dialog');
    render(
      <GenerateBillDialog open onClose={onClose} onGenerated={onGenerated} />
    );
    fireEvent.click(screen.getByRole('button', { name: /generate bills/i }));
    await waitFor(() => {
      expect(onGenerated).toHaveBeenCalledOnce();
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  it('shows error message on generation failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Building not found' }),
    });
    const { GenerateBillDialog } = await import('../generate-bill-dialog');
    render(
      <GenerateBillDialog open onClose={vi.fn()} onGenerated={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: /generate bills/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Building not found');
    });
  });

  it('does not render when open=false', async () => {
    const { GenerateBillDialog } = await import('../generate-bill-dialog');
    const { container } = render(
      <GenerateBillDialog open={false} onClose={vi.fn()} onGenerated={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});

// ── BillList ───────────────────────────────────────────────────────────────
describe('BillList', () => {
  it('renders bill rows with hosteler, room, status, total', async () => {
    const { BillList } = await import('../bill-list');
    render(
      <BillList
        bills={[generatedBill, transmittedBill]}
        onBillClick={vi.fn()}
      />
    );
    expect(screen.getAllByText('John Doe')).toHaveLength(2);
    expect(screen.getByText(/generated, awaiting transmission/i)).toBeInTheDocument();
    expect(screen.getAllByText(/transmitted/i).length).toBeGreaterThanOrEqual(1);
  });

  it('calls onBillClick when a row is clicked', async () => {
    const onBillClick = vi.fn();
    const { BillList } = await import('../bill-list');
    render(
      <BillList bills={[generatedBill]} onBillClick={onBillClick} />
    );
    fireEvent.click(screen.getByRole('button', { name: /view bill for john doe/i }));
    expect(onBillClick).toHaveBeenCalledWith(generatedBill);
  });

  it('shows empty state when no bills', async () => {
    const { BillList } = await import('../bill-list');
    render(<BillList bills={[]} onBillClick={vi.fn()} />);
    expect(screen.getByText(/no bills found/i)).toBeInTheDocument();
  });

  it('filters by status (T119b)', async () => {
    const onFilter = vi.fn();
    const { BillList } = await import('../bill-list');
    render(
      <BillList
        bills={[generatedBill, transmittedBill]}
        onBillClick={vi.fn()}
        statusFilter="transmitted"
        onStatusFilterChange={onFilter}
      />
    );
    // Only transmitted bill should show
    expect(screen.queryByText(/generated, awaiting/i)).not.toBeInTheDocument();
  });

  it('filters by hosteler search (T119b)', async () => {
    const { BillList } = await import('../bill-list');
    const otherBill = { ...generatedBill, id: 'bill-3', hostelers: { name: 'Jane Smith', room_id: null, rooms: null } };
    render(
      <BillList
        bills={[generatedBill, otherBill]}
        onBillClick={vi.fn()}
        searchQuery="jane"
        onSearchChange={vi.fn()}
      />
    );
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });
});

// ── BillDetailModal ────────────────────────────────────────────────────────
describe('BillDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders null when bill is null', async () => {
    const { BillDetailModal } = await import('../bill-detail-modal');
    const { container } = render(
      <BillDetailModal bill={null} onClose={vi.fn()} onTransmitted={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows bill breakdown and transmit button for generated bill', async () => {
    const { BillDetailModal } = await import('../bill-detail-modal');
    render(
      <BillDetailModal
        bill={generatedBill}
        onClose={vi.fn()}
        onTransmitted={vi.fn()}
      />
    );
    expect(screen.getByText(/room rent total/i)).toBeInTheDocument();
    expect(screen.getByText(/breakfast/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /transmit bill/i })).toBeInTheDocument();
  });

  it('does not show transmit button for transmitted bill', async () => {
    const { BillDetailModal } = await import('../bill-detail-modal');
    render(
      <BillDetailModal
        bill={transmittedBill}
        onClose={vi.fn()}
        onTransmitted={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: /transmit bill/i })).not.toBeInTheDocument();
  });

  it('calls onTransmitted and onClose on successful transmit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bill: { ...generatedBill, status: 'transmitted' } }),
    });
    const onTransmitted = vi.fn();
    const onClose = vi.fn();
    const { BillDetailModal } = await import('../bill-detail-modal');
    render(
      <BillDetailModal
        bill={generatedBill}
        onClose={onClose}
        onTransmitted={onTransmitted}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /transmit bill/i }));
    await waitFor(() => {
      expect(onTransmitted).toHaveBeenCalledWith(generatedBill.id);
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  it('shows error on transmit failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Already transmitted' }),
    });
    const { BillDetailModal } = await import('../bill-detail-modal');
    render(
      <BillDetailModal
        bill={generatedBill}
        onClose={vi.fn()}
        onTransmitted={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /transmit bill/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Already transmitted');
    });
  });

  it('toggles breakdown collapsed/expanded (T119b)', async () => {
    const { BillDetailModal } = await import('../bill-detail-modal');
    render(
      <BillDetailModal
        bill={generatedBill}
        onClose={vi.fn()}
        onTransmitted={vi.fn()}
      />
    );
    // Initially expanded
    expect(screen.getByText(/room rent total/i)).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(screen.getByText(/collapse breakdown/i));
    expect(screen.queryByText(/room rent total/i)).not.toBeInTheDocument();

    // Click to re-expand
    fireEvent.click(screen.getByText(/expand breakdown/i));
    expect(screen.getByText(/room rent total/i)).toBeInTheDocument();
  });
});
