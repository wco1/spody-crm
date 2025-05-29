import { NextResponse } from 'next/server';
import { ModelService, type ModelCreateInput } from '../../utils/modelService';

// GET /api/models
export async function GET() {
  try {
    const models = await ModelService.getAllModels();
    return NextResponse.json(models);
  } catch (error) {
    console.error('Error in GET /api/models:', error);
    return NextResponse.json(
      { error: 'Ошибка получения моделей' },
      { status: 500 }
    );
  }
}

// POST /api/models
export async function POST(request: Request) {
  try {
    // Получаем данные из запроса
    const modelData: ModelCreateInput = await request.json();
    
    console.log('Создаем модель с данными:', modelData);
    
    // Проверяем обязательные поля
    if (!modelData.name || !modelData.name.trim()) {
      return NextResponse.json(
        { error: 'Необходимо указать имя модели' },
        { status: 400 }
      );
    }
    
    // Если указан URL аватара, сохраняем его как есть
    // Валидация будет выполнена в ModelService
    
    // Создаем модель
    const createdModel = await ModelService.createModel(modelData);
    
    if (!createdModel) {
      return NextResponse.json(
        { error: 'Не удалось создать модель' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(createdModel, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/models:', error);
    
    return NextResponse.json(
      { error: 'Ошибка создания модели', details: (error as Error).message },
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 