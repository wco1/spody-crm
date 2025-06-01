import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://avfdefowtxijmlvocodx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZmRlZm93dHhpam1sdm9jb2R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU0ODQwOSwiZXhwIjoyMDY0MTI0NDA5fQ.ePgjFJgQFTkNuxDDYIrozfhV5SMdIAri8-nuZ3mMT5w'
);

// GET /api/prompts/[id] - получить конкретный промпт
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
          is_active
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
  try {
    const body = await request.json();
    const { prompt_text, version, is_active } = body;

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
          is_active
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