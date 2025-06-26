import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../utils/supabase';

// GET /api/models/photos?model_id=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modelId = searchParams.get('model_id');
  const debug = searchParams.get('debug');
  const checkTable = searchParams.get('check_table');

  if (!modelId) {
    return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
  }

  try {
    // Если запрошена проверка таблицы
    if (checkTable === 'true') {
      console.log('🔍 Проверяем существование таблицы ai_model_photos...');
      
      // Проверяем существование таблицы
      const { data: tableCheck, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'ai_model_photos');
      
      if (tableError) {
        console.error('Ошибка проверки таблицы:', tableError);
        return NextResponse.json({
          error: 'Failed to check table existence',
          details: tableError.message
        }, { status: 500 });
      }
      
      const tableExists = tableCheck && tableCheck.length > 0;
      console.log('📊 Таблица ai_model_photos существует:', tableExists);
      
      if (!tableExists) {
        return NextResponse.json({
          error: 'Table ai_model_photos does not exist',
          suggestion: 'Please run the migration script',
          tableExists: false
        }, { status: 404 });
      }
      
      return NextResponse.json({
        message: 'Table ai_model_photos exists',
        tableExists: true
      });
    }

    console.log(`🔍 Получаем фото для модели: ${modelId}`);
    
    // Получаем все фото модели
    const { data: photos, error } = await supabase
      .from('ai_model_photos')
      .select(`
        id,
        ai_model_id,
        photo_url,
        send_priority,
        display_order,
        caption,
        created_at
      `)
      .eq('ai_model_id', modelId)
      .order('send_priority')
      .order('display_order');

    if (error) {
      console.error('Ошибка получения фото:', error);
      return NextResponse.json({
        error: 'Failed to fetch photos',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }

    console.log(`📸 Найдено фото: ${photos?.length || 0}`);

    // Если режим отладки - возвращаем подробную информацию
    if (debug === 'true') {
      const profilePhotos = photos?.filter(p => p.send_priority === 0) || [];
      const messagePhotos = photos?.filter(p => p.send_priority > 0) || [];
      
      return NextResponse.json({
        total: photos?.length || 0,
        profilePhotos: {
          count: profilePhotos.length,
          photos: profilePhotos
        },
        messagePhotos: {
          count: messagePhotos.length,
          photos: messagePhotos
        },
        allPhotos: photos || []
      });
    }

    return NextResponse.json(photos || []);
  } catch (error) {
    console.error('Критическая ошибка в GET /api/models/photos:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// POST /api/models/photos
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ai_model_id, photo_url, caption, order_index, is_active = true } = body;

    if (!ai_model_id || !photo_url) {
      return NextResponse.json(
        { error: 'ai_model_id and photo_url are required' },
        { status: 400 }
      );
    }

    // Проверяем существует ли модель
    const { data: model, error: modelError } = await supabase
      .from('ai_models')
      .select('id')
      .eq('id', ai_model_id)
      .single();

    if (modelError || !model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Если order_index не указан, берем следующий номер
    let finalOrderIndex = order_index;
    if (finalOrderIndex === undefined || finalOrderIndex === null) {
      const { data: lastPhoto } = await supabase
        .from('ai_model_photos')
        .select('order_index')
        .eq('ai_model_id', ai_model_id)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      finalOrderIndex = (lastPhoto?.order_index || 0) + 1;
    }

    const { data: photo, error } = await supabase
      .from('ai_model_photos')
      .insert({
        ai_model_id,
        photo_url,
        caption: caption || null,
        order_index: finalOrderIndex,
        is_active
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating photo:', error);
      return NextResponse.json(
        { error: 'Failed to create photo' },
        { status: 500 }
      );
    }

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/models/photos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/models/photos
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('id');

    if (!photoId) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('ai_model_photos')
      .delete()
      .eq('id', photoId);

    if (error) {
      console.error('Error deleting photo:', error);
      return NextResponse.json(
        { error: 'Failed to delete photo' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/models/photos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 