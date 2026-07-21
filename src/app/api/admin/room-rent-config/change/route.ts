import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { withApiDiagnostic } from '@/lib/diagnostics/events';
import { isDateWithin3MonthWindow } from '@/lib/rate-change-window';

export const runtime = 'edge';

let supabaseClient: SupabaseClient<any, 'public', any> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase server environment is not configured.');
    }

    supabaseClient = createClient(supabaseUrl, serviceRoleKey);
  }

  return supabaseClient;
}

const supabase = new Proxy({} as SupabaseClient<any, 'public', any>, {
  get(_target, property, receiver) {
    return Reflect.get(getSupabaseClient() as object, property, receiver);
  },
});

export async function POST(request: NextRequest) {
  return withApiDiagnostic(
    { route: '/api/admin/room-rent-config/change', method: 'POST', action: 'room-rent-config.change' },
    async () => {
    // Authenticate as owner
    const token = request.cookies.get('sb-access-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sharing_capacity, room_class, new_rent, effective_date } = body;

    // Validation
    if (!sharing_capacity || sharing_capacity < 1) {
      return NextResponse.json(
        { error: 'sharing_capacity must be >= 1' },
        { status: 400 }
      );
    }

    if (!room_class || !['ac', 'non_ac'].includes(room_class)) {
      return NextResponse.json(
        { error: "room_class must be 'ac' or 'non_ac'" },
        { status: 400 }
      );
    }

    if (!new_rent || new_rent <= 0) {
      return NextResponse.json(
        { error: 'new_rent must be > 0' },
        { status: 400 }
      );
    }

    // Validate effective_date is within 3-month window (previous, current, next month)
    if (!effective_date) {
      return NextResponse.json(
        { error: 'effective_date is required' },
        { status: 400 }
      );
    }

    if (!isDateWithin3MonthWindow(effective_date)) {
      return NextResponse.json(
        { error: 'Effective date must be within the 3-month window (previous, current, or next month). You cannot schedule changes for months outside this range.' },
        { status: 400 }
      );
    }

    // Get current room rent for old_rent value (from room_configuration_history)
    const { data: currentConfig } = await supabase
      .from('room_configuration_history')
      .select('room_rent')
      .eq('owner_id', user.id)
      .eq('sharing_capacity', sharing_capacity)
      .eq('room_class', room_class)
      .order('effective_date', { ascending: false })
      .limit(1);

    const old_rent = currentConfig?.[0]?.room_rent || 0;

    // Insert into room_rent_config_history
    const { data, error } = await supabase
      .from('room_rent_config_history')
      .insert({
        owner_id: user.id,
        sharing_capacity,
        room_class,
        old_rent,
        new_rent,
        effective_date,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        return NextResponse.json(
          { error: 'A rent change for this configuration already exists on that date' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  });
}
