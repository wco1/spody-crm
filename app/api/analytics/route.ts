import { NextRequest, NextResponse } from 'next/server';
import { getAnalyticsData } from '../../utils/analytics';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') as 'week' | 'month' | 'year' || 'month';

    if (!['week', 'month', 'year'].includes(period)) {
      return NextResponse.json(
        { success: false, error: 'Неверный период. Используйте: week, month, year' },
        { status: 400 }
      );
    }

    const data = await getAnalyticsData(period);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Ошибка получения аналитики:', error);
    return NextResponse.json(
      { success: false, error: 'Не удалось получить данные аналитики' },
      { status: 500 }
    );
  }
} 