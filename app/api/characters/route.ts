import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Пока возвращаем пустой массив как заглушку
    // В будущем здесь будет логика получения персонажей
    return NextResponse.json({
      characters: [],
      message: 'Characters API endpoint is ready'
    });
  } catch (error) {
    console.error('Error in characters API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Заглушка для создания персонажа
    return NextResponse.json({
      message: 'Character creation endpoint - coming soon',
      received: body
    });
  } catch (error) {
    console.error('Error creating character:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 