import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../utils/supabase';

// GET /api/conversations
export async function GET() {
  try {
    console.log('📞 [CONVERSATIONS API] Получение списка бесед...');
    
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [CONVERSATIONS API] Ошибка получения бесед:', error);
      console.error('📝 [CONVERSATIONS API] Детали ошибки:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // Если таблица не существует, возвращаем пустой массив
      if (error.code === '42P01') { // relation does not exist
        console.warn('⚠️ [CONVERSATIONS API] Таблица conversations не существует, возвращаем пустой результат');
        return NextResponse.json({ 
          conversations: [],
          count: 0,
          warning: 'Таблица conversations не найдена в базе данных'
        });
      }
      
      return NextResponse.json(
        { 
          error: 'Ошибка получения бесед',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }

    console.log(`✅ [CONVERSATIONS API] Найдено бесед: ${data?.length || 0}`);
    
    return NextResponse.json({ 
      conversations: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('💥 [CONVERSATIONS API] Неожиданная ошибка:', error);
    return NextResponse.json(
      { 
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// POST /api/conversations
export async function POST(request: NextRequest) {
  try {
    console.log('📝 [CONVERSATIONS API] Создание новой беседы...');
    
    const body = await request.json();
    const { user_id, model_id, title } = body;

    console.log('📝 [CONVERSATIONS API] Данные для создания:', { user_id, model_id, title });

    if (!user_id || !model_id) {
      console.warn('⚠️ [CONVERSATIONS API] Отсутствуют обязательные поля');
      return NextResponse.json(
        { error: 'Требуются поля user_id и model_id' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('conversations')
      .insert([{
        user_id,
        model_id,
        title: title || 'Новая беседа'
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ [CONVERSATIONS API] Ошибка создания беседы:', error);
      
      // Если таблица не существует
      if (error.code === '42P01') {
        return NextResponse.json(
          { 
            error: 'Таблица conversations не существует',
            details: 'Обратитесь к администратору для создания таблицы',
            suggestion: 'Необходимо создать таблицу conversations в базе данных'
          },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Ошибка создания беседы',
          details: error.message
        },
        { status: 500 }
      );
    }

    console.log('✅ [CONVERSATIONS API] Беседа создана:', data);
    
    return NextResponse.json({ conversation: data }, { status: 201 });
  } catch (error) {
    console.error('💥 [CONVERSATIONS API] Неожиданная ошибка при создании:', error);
    return NextResponse.json(
      { 
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 