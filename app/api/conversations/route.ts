import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../utils/supabase';

// GET /api/conversations
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка получения бесед:', error);
      return NextResponse.json(
        { error: 'Ошибка получения бесед' },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversations: data || [] });
  } catch (error) {
    console.error('Неожиданная ошибка:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST /api/conversations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, model_id, title } = body;

    if (!user_id || !model_id) {
      return NextResponse.json(
        { error: 'Требуются поля user_id и model_id' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('conversations')
      .insert([{
        user_id,
        model_id,
        title: title || 'Новая беседа'
      }])
      .select()
      .single();

    if (error) {
      console.error('Ошибка создания беседы:', error);
      return NextResponse.json(
        { error: 'Ошибка создания беседы' },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversation: data }, { status: 201 });
  } catch (error) {
    console.error('Неожиданная ошибка:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
} 