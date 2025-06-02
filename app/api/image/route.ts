import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../utils/supabase';

// GET /api/image - получить изображение модели
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('model_id');
    
    if (!modelId) {
      return NextResponse.json(
        { error: 'Требуется параметр model_id' },
        { status: 400 }
      );
    }

    // Получаем информацию о модели
    const { data: model, error } = await supabaseAdmin
      .from('ai_models')
      .select('avatar_url, name, gender')
      .eq('id', modelId)
      .single();

    if (error) {
      console.error('Ошибка получения модели:', error);
      return NextResponse.json(
        { error: 'Модель не найдена' },
        { status: 404 }
      );
    }

    // Возвращаем URL изображения или fallback
    const avatarUrl = model?.avatar_url || 
      (model?.gender === 'male' ? '/default-male-avatar.png' : '/default-female-avatar.png');

    return NextResponse.json({ 
      avatar_url: avatarUrl,
      model_name: model?.name,
      gender: model?.gender 
    });
  } catch (error) {
    console.error('Неожиданная ошибка:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST /api/image - загрузить изображение для модели
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const modelId = formData.get('model_id') as string;

    if (!file || !modelId) {
      return NextResponse.json(
        { error: 'Требуются файл и model_id' },
        { status: 400 }
      );
    }

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Файл должен быть изображением' },
        { status: 400 }
      );
    }

    // Ограничение размера файла (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Размер файла не должен превышать 5MB' },
        { status: 400 }
      );
    }

    // Создаем имя файла
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${modelId}-${Date.now()}.${fileExtension}`;

    // Загружаем в Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('ai-models-avatars')
      .upload(`public/${fileName}`, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Ошибка загрузки файла:', uploadError);
      return NextResponse.json(
        { error: 'Ошибка загрузки файла' },
        { status: 500 }
      );
    }

    // Получаем публичный URL
    const { data: urlData } = supabaseAdmin.storage
      .from('ai-models-avatars')
      .getPublicUrl(`public/${fileName}`);

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: 'Не удалось получить URL изображения' },
        { status: 500 }
      );
    }

    // Обновляем модель с новым URL
    const { error: updateError } = await supabaseAdmin
      .from('ai_models')
      .update({ 
        avatar_url: urlData.publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', modelId);

    if (updateError) {
      console.error('Ошибка обновления модели:', updateError);
      return NextResponse.json(
        { error: 'Ошибка обновления модели' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      avatar_url: urlData.publicUrl,
      message: 'Изображение успешно загружено'
    });

  } catch (error) {
    console.error('Неожиданная ошибка:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
} 