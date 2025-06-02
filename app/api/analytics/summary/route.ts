import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../utils/supabase';

export async function GET(request: NextRequest) {
  try {
    // Получаем базовую статистику из различных таблиц
    const [profilesResult, modelsResult, messagesResult] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact' }),
      supabase.from('ai_models').select('*', { count: 'exact' }),
      supabase.from('chat_messages').select('*', { count: 'exact' }).limit(1000)
    ]);

    const totalUsers = profilesResult.count || 0;
    const totalModels = modelsResult.count || 0;
    const totalMessages = messagesResult.count || 0;
    
    // Подсчитываем активных пользователей (за последние 30 дней)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: activeUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Подсчитываем новых пользователей (за последние 7 дней)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: newUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .gte('created_at', sevenDaysAgo.toISOString());

    const summary = {
      totalUsers,
      activeUsers: activeUsers || 0,
      newUsers: newUsers || 0,
      totalModels,
      totalMessages,
      averageMessagesPerUser: totalUsers > 0 ? Math.round(totalMessages / totalUsers) : 0,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Ошибка получения summary аналитики:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Не удалось получить сводные данные аналитики',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
      { status: 500 }
    );
  }
} 