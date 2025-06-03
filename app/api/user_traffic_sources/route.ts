import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../utils/supabase';

// GET /api/user_traffic_sources
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_traffic_sources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка получения источников трафика:', error);
      return NextResponse.json(
        { error: 'Ошибка получения источников трафика' },
        { status: 500 }
      );
    }

    return NextResponse.json({ traffic_sources: data || [] });
  } catch (error) {
    console.error('Неожиданная ошибка:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST /api/user_traffic_sources
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, source, medium, campaign, content, term, referrer } = body;

    if (!user_id || !source) {
      return NextResponse.json(
        { error: 'Требуются поля user_id и source' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('user_traffic_sources')
      .insert([{
        user_id,
        source,
        medium,
        campaign,
        content,
        term,
        referrer
      }])
      .select()
      .single();

    if (error) {
      console.error('Ошибка создания записи источника трафика:', error);
      return NextResponse.json(
        { error: 'Ошибка создания записи источника трафика' },
        { status: 500 }
      );
    }

    return NextResponse.json({ traffic_source: data }, { status: 201 });
  } catch (error) {
    console.error('Неожиданная ошибка:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
} 