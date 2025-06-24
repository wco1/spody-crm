import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../utils/supabase';

// GET /api/models/photos?model_id=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('model_id');

    if (!modelId) {
      return NextResponse.json(
        { error: 'model_id is required' },
        { status: 400 }
      );
    }

    const { data: photos, error } = await supabase
      .from('ai_model_photos')
      .select('*')
      .eq('model_id', modelId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching photos:', error);
      return NextResponse.json(
        { error: 'Failed to fetch photos' },
        { status: 500 }
      );
    }

    return NextResponse.json(photos || []);
  } catch (error) {
    console.error('Error in GET /api/models/photos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/models/photos
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { model_id, photo_url, display_order, is_active = true } = body;

    if (!model_id || !photo_url) {
      return NextResponse.json(
        { error: 'model_id and photo_url are required' },
        { status: 400 }
      );
    }

    // Проверяем существует ли модель
    const { data: model, error: modelError } = await supabase
      .from('ai_models')
      .select('id')
      .eq('id', model_id)
      .single();

    if (modelError || !model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Если display_order не указан, берем следующий номер
    let finalOrderIndex = display_order;
    if (finalOrderIndex === undefined || finalOrderIndex === null) {
      const { data: lastPhoto } = await supabase
        .from('ai_model_photos')
        .select('display_order')
        .eq('model_id', model_id)
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

      finalOrderIndex = (lastPhoto?.display_order || 0) + 1;
    }

    const { data: photo, error } = await supabase
      .from('ai_model_photos')
      .insert({
        model_id,
        photo_url,
        display_order: finalOrderIndex,
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