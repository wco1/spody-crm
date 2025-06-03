import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Проверяем переменные окружения
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseServiceKey
  });
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// GET /api/prompts/[id] - получить конкретный промпт
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabase) {
    return NextResponse.json(
      { error: 'Сервис временно недоступен' },
      { status: 503 }
    );
  }

  try {
    const { data, error } = await supabase
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
          is_active,
          character_id
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Ошибка получения промпта:', error);
      return NextResponse.json(
        { error: 'Промпт не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json({ prompt: data });
  } catch (error) {
    console.error('Неожиданная ошибка:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// PUT /api/prompts/[id] - обновить промпт
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabase) {
    return NextResponse.json(
      { error: 'Сервис временно недоступен' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { prompt_text, version, is_active, openrouter_model } = body;

    if (!prompt_text) {
      return NextResponse.json(
        { error: 'Требуется поле prompt_text' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('ai_prompts')
      .update({
        prompt_text,
        version: version || 1,
        is_active: is_active !== undefined ? is_active : true,
        openrouter_model: openrouter_model || 'mistralai/mistral-medium-3',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
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
          is_active,
          character_id
        )
      `)
      .single();

    if (error) {
      console.error('Ошибка обновления промпта:', error);
      return NextResponse.json(
        { error: 'Ошибка обновления промпта' },
        { status: 500 }
      );
    }

    return NextResponse.json({ prompt: data });
  } catch (error) {
    console.error('Неожиданная ошибка:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// DELETE /api/prompts/[id] - удалить промпт
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabase) {
    return NextResponse.json(
      { error: 'Сервис временно недоступен' },
      { status: 503 }
    );
  }

  try {
    const { error } = await supabase
      .from('ai_prompts')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Ошибка удаления промпта:', error);
      return NextResponse.json(
        { error: 'Ошибка удаления промпта' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Промпт успешно удален' });
  } catch (error) {
    console.error('Неожиданная ошибка:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
} 