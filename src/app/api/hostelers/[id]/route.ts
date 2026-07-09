export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guards';
import { createServiceClient } from '@/lib/supabase/server';
import { getTodayIST } from '@/lib/utils';
import { withApiDiagnostic } from '@/lib/diagnostics/events';

function buildActiveDeleteMessage(futurePreferenceCount: number, effectiveDate: string) {
  return `Deleting this hosteler will revoke login access immediately, preserve past and same-day history, and cancel ${futurePreferenceCount} future-dated food preference row${futurePreferenceCount === 1 ? '' : 's'} after ${effectiveDate}. Delete anyway?`;
}

async function handleGet(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const { id } = await params;
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view');

  const { data: hosteler, error: hostelerError } = await supabase
    .from('hostelers')
    .select(
      'id, name, phone, room_number, status, activated_at, deleted_at, deleted_from_status, deletion_effective_date, created_at, updated_at'
    )
    .eq('id', id)
    .single();

  if (hostelerError || !hosteler) {
    return NextResponse.json({ error: 'Hosteler not found' }, { status: 404 });
  }

  if (view !== 'audit') {
    return NextResponse.json({ hosteler });
  }

  if (hosteler.status !== 'deleted') {
    return NextResponse.json(
      { error: 'Audit view is available only for deleted hostelers' },
      { status: 400 }
    );
  }

  const { data: canceledFuturePreferences, error: auditError } = await supabase
    .from('food_preferences')
    .select(
      'id, hosteler_id, date, breakfast, lunch, dinner, submitted_at, updated_at, canceled_at, cancellation_reason'
    )
    .eq('hosteler_id', id)
    .not('canceled_at', 'is', null)
    .order('date', { ascending: true });

  if (auditError) {
    return NextResponse.json(
      { error: 'Failed to fetch deleted hosteler audit detail' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    hosteler,
    audit: {
      preserved_history_through: hosteler.deletion_effective_date,
      canceled_future_preferences: canceledFuturePreferences ?? [],
    },
  });
}

async function handlePatch(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const { id } = await params;
  const supabase = createServiceClient();

  let body: { action?: string; confirmed?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, confirmed } = body;

  if (!action || !['deactivate', 'reactivate', 'delete'].includes(action)) {
    return NextResponse.json(
      { error: 'Invalid action. Must be "deactivate", "reactivate", or "delete"' },
      { status: 400 }
    );
  }

  // Fetch hosteler
  const { data: hosteler, error: fetchError } = await supabase
    .from('hostelers')
    .select('id, name, status, auth_user_id, deleted_at, deleted_from_status, deletion_effective_date')
    .eq('id', id)
    .single();

  if (fetchError || !hosteler) {
    return NextResponse.json({ error: 'Hosteler not found' }, { status: 404 });
  }

  if (action === 'deactivate') {
    if (hosteler.status === 'pending') {
      return NextResponse.json(
        { error: 'Cannot deactivate a pending hosteler' },
        { status: 400 }
      );
    }
    if (hosteler.status === 'inactive') {
      return NextResponse.json(
        { error: 'Hosteler is already inactive' },
        { status: 400 }
      );
    }
    if (hosteler.status === 'deleted') {
      return NextResponse.json(
        { error: 'Deleted hostelers are audit-only and cannot be deactivated' },
        { status: 400 }
      );
    }

    // Check future food preferences
    const today = getTodayIST();
    const { count: futureCount } = await supabase
      .from('food_preferences')
      .select('*', { count: 'exact', head: true })
      .eq('hosteler_id', id)
      .is('canceled_at', null)
      .gt('date', today);

    if (futureCount && futureCount > 0 && !confirmed) {
      return NextResponse.json({
        requires_confirmation: true,
        future_preference_count: futureCount,
        message: `This hosteler has submitted preferences for ${futureCount} future dates. These will remain and be included in billing.`,
      });
    }

    // Deactivate
    const { error: updateError } = await supabase
      .from('hostelers')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to deactivate hosteler' }, { status: 500 });
    }

    // Invalidate all sessions
    if (hosteler.auth_user_id) {
      await supabase.auth.admin.signOut(hosteler.auth_user_id, 'global');
    }

    return NextResponse.json({
      hosteler: { id: hosteler.id, name: hosteler.name, status: 'inactive' },
    });
  }

  if (action === 'reactivate') {
    if (hosteler.status !== 'inactive') {
      return NextResponse.json(
        { error: 'Only inactive hostelers can be reactivated' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('hostelers')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to reactivate hosteler' }, { status: 500 });
    }

    return NextResponse.json({
      hosteler: { id: hosteler.id, name: hosteler.name, status: 'active' },
    });
  }

  if (hosteler.status === 'inactive') {
    return NextResponse.json(
      { error: 'Deleting inactive hostelers is unsupported in v1' },
      { status: 400 }
    );
  }

  if (hosteler.status === 'deleted') {
    return NextResponse.json(
      { error: 'Deleted hostelers are audit-only and cannot be restored or deleted again' },
      { status: 400 }
    );
  }

  const deletedAt = new Date().toISOString();
  const deletionEffectiveDate = getTodayIST();

  if (hosteler.status === 'pending') {
    const { error: inviteInvalidateError } = await supabase
      .from('invite_tokens')
      .update({ used: true })
      .eq('hosteler_id', id);

    if (inviteInvalidateError) {
      return NextResponse.json(
        { error: 'Failed to invalidate pending hosteler invite tokens' },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabase
      .from('hostelers')
      .update({
        status: 'deleted',
        deleted_at: deletedAt,
        deleted_from_status: 'pending',
        deletion_effective_date: deletionEffectiveDate,
        updated_at: deletedAt,
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to delete hosteler' }, { status: 500 });
    }

    return NextResponse.json({
      hosteler: {
        id: hosteler.id,
        name: hosteler.name,
        status: 'deleted',
        deleted_from_status: 'pending',
        deleted_at: deletedAt,
        deletion_effective_date: deletionEffectiveDate,
      },
      canceled_future_preferences: 0,
    });
  }

  const { count: futurePreferenceCount } = await supabase
    .from('food_preferences')
    .select('*', { count: 'exact', head: true })
    .eq('hosteler_id', id)
    .is('canceled_at', null)
    .gt('date', deletionEffectiveDate);

  if (!confirmed) {
    return NextResponse.json({
      requires_confirmation: true,
      deletion_effective_date: deletionEffectiveDate,
      future_preference_count: futurePreferenceCount ?? 0,
      message: buildActiveDeleteMessage(futurePreferenceCount ?? 0, deletionEffectiveDate),
    });
  }

  await supabase
    .from('invite_tokens')
    .update({ used: true })
    .eq('hosteler_id', id)
    .eq('used', false);

  const { data: canceledRows, error: cancelError } = await supabase
    .from('food_preferences')
    .update({
      canceled_at: deletedAt,
      cancellation_reason: 'hosteler_deleted',
      updated_at: deletedAt,
    })
    .eq('hosteler_id', id)
    .is('canceled_at', null)
    .gt('date', deletionEffectiveDate)
    .select('id');

  if (cancelError) {
    return NextResponse.json(
      { error: 'Failed to cancel future food preferences' },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabase
    .from('hostelers')
    .update({
      status: 'deleted',
      deleted_at: deletedAt,
      deleted_from_status: 'active',
      deletion_effective_date: deletionEffectiveDate,
      updated_at: deletedAt,
    })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to delete hosteler' }, { status: 500 });
  }

  if (hosteler.auth_user_id) {
    await supabase.auth.admin.signOut(hosteler.auth_user_id, 'global');
  }

  return NextResponse.json({
    hosteler: {
      id: hosteler.id,
      name: hosteler.name,
      status: 'deleted',
      deleted_from_status: 'active',
      deleted_at: deletedAt,
      deletion_effective_date: deletionEffectiveDate,
    },
    canceled_future_preferences: canceledRows?.length ?? 0,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return withApiDiagnostic(
    { route: '/api/hostelers/[id]', method: 'GET', action: 'hosteler.read' },
    () => handleGet(request, context),
  );
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return withApiDiagnostic(
    { route: '/api/hostelers/[id]', method: 'PATCH', action: 'hosteler.lifecycle' },
    () => handlePatch(request, context),
  );
}
