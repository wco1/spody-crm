import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../utils/supabase";

export async function POST(request: Request) {
  try {
    console.log("🚀 Создаем таблицу ai_model_photos если её нет...");
    
    // Простое создание таблицы
    const { error } = await supabase
      .from("ai_model_photos")
      .select("id")
      .limit(1);
    
    if (error && error.code === "42P01") {
      // Таблица не существует
      console.log("❌ Таблица ai_model_photos не существует. Нужно выполнить миграцию в Supabase.");
      return NextResponse.json({
        success: false,
        error: "Table ai_model_photos does not exist",
        hint: "Please run the SQL migration in Supabase Dashboard",
        sql: `CREATE TABLE ai_model_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ai_model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  storage_path TEXT,
  caption TEXT,
  display_order INTEGER DEFAULT 1,
  send_priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`
      }, { status: 404 });
    }
    
    if (error) {
      console.error("❌ Ошибка доступа к таблице:", error);
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code
      }, { status: 500 });
    }
    
    console.log("✅ Таблица ai_model_photos существует!");
    
    return NextResponse.json({
      success: true,
      message: "Table ai_model_photos exists and is accessible"
    });
    
  } catch (error) {
    console.error("💥 Критическая ошибка:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
