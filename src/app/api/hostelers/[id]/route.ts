export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guards';
import { createServiceClient } from '@/lib/supabase/server';
import { getTodayIST } from '@/lib/utils';

export async function PATCH(
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

  if (!action || !['deactivate', 'reactivate'].includes(action)) {
    return NextResponse.json(
      { error: 'Invalid action. Must be "deactivate" or "reactivate"' },
      { status: 400 }
    );
  }

  // Fetch hosteler
  const { data: hosteler, error: fetchError } = await supabase
    .from('hostelers')
    .select('id, name, status, auth_user_id')
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

    // Check future food preferences
    const today = getTodayIST();
    const { count: futureCount } = await supabase
      .from('food_preferences')
      .select('*', { count: 'exact', head: true })
      .eq('hosteler_id', id)
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
}
