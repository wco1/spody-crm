import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../utils/supabase';

// GET - получить все трекинговые ссылки
export async function GET() {
  try {
    console.log('📋 [TRACKING API] Получение трекинговых ссылок из базы данных');
    
    const { data: links, error } = await supabase
      .from('tracking_links')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [TRACKING API] Ошибка получения ссылок:', error);
      return NextResponse.json({ error: 'Ошибка получения данных' }, { status: 500 });
    }

    // Подсчитываем клики для каждой ссылки
    const linksWithStats = await Promise.all(
      (links || []).map(async (link) => {
        const { count } = await supabase
          .from('user_traffic_sources')
          .select('*', { count: 'exact' })
          .eq('tracking_link_id', link.id);

        return {
          ...link,
          clicks: count || 0
        };
      })
    );

    console.log('✅ [TRACKING API] Возвращаем', linksWithStats.length, 'ссылок');
    return NextResponse.json({ links: linksWithStats });
    
  } catch (error) {
    console.error('❌ [TRACKING API] Ошибка получения ссылок:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// POST - создать новую трекинговую ссылку
export async function POST(request: NextRequest) {
  try {
    console.log('📝 [TRACKING API] Создание новой трекинговой ссылки');
    
    const body = await request.json();
    const { name, source, medium, campaign, content, term } = body;

    if (!name || !source) {
      return NextResponse.json({ error: 'Название и источник обязательны' }, { status: 400 });
    }

    // Генерируем уникальный код
    const code = generateUniqueCode();
    
    // Создаем UTM-параметры
    const utmParams = new URLSearchParams();
    utmParams.set('utm_source', source);
    if (medium) utmParams.set('utm_medium', medium);
    if (campaign) utmParams.set('utm_campaign', campaign);
    if (content) utmParams.set('utm_content', content);
    if (term) utmParams.set('utm_term', term);
    utmParams.set('ref', code);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const trackingUrl = `${baseUrl}?${utmParams.toString()}`;

    // Сохраняем в базу данных
    const { data: link, error } = await supabase
      .from('tracking_links')
      .insert({
        name,
        code,
        source,
        medium,
        campaign,
        content,
        term,
        url: trackingUrl,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [TRACKING API] Ошибка создания ссылки:', error);
      return NextResponse.json({ error: 'Ошибка создания ссылки' }, { status: 500 });
    }

    console.log('✅ [TRACKING API] Ссылка создана:', link.name);
    return NextResponse.json({ link: { ...link, clicks: 0 } });
    
  } catch (error) {
    console.error('❌ [TRACKING API] Ошибка создания ссылки:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// DELETE - удалить трекинговую ссылку
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ [TRACKING API] Удаление трекинговой ссылки');
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID ссылки обязателен' }, { status: 400 });
    }

    const { error } = await supabase
      .from('tracking_links')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('❌ [TRACKING API] Ошибка удаления ссылки:', error);
      return NextResponse.json({ error: 'Ошибка удаления ссылки' }, { status: 500 });
    }

    console.log('✅ [TRACKING API] Ссылка удалена, ID:', id);
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('❌ [TRACKING API] Ошибка удаления ссылки:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// Функция генерации уникального кода
function generateUniqueCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
} 