import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../utils/supabase';

// GET /api/prompts - получить все промпты с моделями
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('ai_prompts')
      .select(`
        *,
        ai_models (
          id,
          name,
          bio,
          avatar_url,
          traits,
          genres,
          gender,
          is_active
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка получения промптов:', error);
      return NextResponse.json(
        { error: 'Ошибка получения промптов' },
        { status: 500 }
      );
    }

    return NextResponse.json({ prompts: data });
  } catch (error) {
    console.error('Неожиданная ошибка:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST /api/prompts - создать новый промпт
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model_id, prompt_text, version, is_active } = body;

    if (!model_id || !prompt_text) {
      return NextResponse.json(
        { error: 'Требуются поля model_id и prompt_text' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('ai_prompts')
      .insert([{
        model_id,
        prompt_text,
        version: version || 1,
        is_active: is_active !== undefined ? is_active : true
      }])
      .select(`
        *,
        ai_models (
          id,
          name,
          bio,
          avatar_url,
          traits,
          genres,
          gender,
          is_active
        )
      `)
      .single();

    if (error) {
      console.error('Ошибка создания промпта:', error);
      return NextResponse.json(
        { error: 'Ошибка создания промпта' },
        { status: 500 }
      );
    }

    return NextResponse.json({ prompt: data }, { status: 201 });
  } catch (error) {
    console.error('Неожиданная ошибка:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
} 