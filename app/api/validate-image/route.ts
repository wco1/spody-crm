import { NextResponse } from 'next/server';
import AvatarService from '../../utils/avatarService';

// POST /api/validate-image
export async function POST(request: Request) {
  try {
    // Получаем URL из запроса
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL не указан' },
        { status: 400 }
      );
    }
    
    console.log('Проверяем URL изображения:', url);
    
    // Валидируем URL с помощью сервиса аватаров
    const validatedUrl = await AvatarService.validateAvatarUrl(url);
    
    if (!validatedUrl) {
      return NextResponse.json(
        { valid: false, message: 'URL не прошел валидацию' },
        { status: 200 }
      );
    }
    
    return NextResponse.json({
      valid: true,
      url: validatedUrl,
      message: 'URL успешно прошел валидацию'
    });
  } catch (error) {
    console.error('Error in POST /api/validate-image:', error);
    
    return NextResponse.json(
      { error: 'Ошибка валидации URL изображения', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Обрабатываем OPTIONS запросы для CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 