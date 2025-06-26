import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../utils/supabase";

export async function GET(request: Request) {
  try {
    console.log("🔍 Тестируем доступ к таблице ai_model_photos...");
    
    const { data: photos, error } = await supabase
      .from("ai_model_photos")
      .select("id, ai_model_id, photo_url, send_priority")
      .limit(5);
    
    if (error) {
      console.error("❌ Ошибка доступа к ai_model_photos:", error);
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details
      }, { status: 500 });
    }
    
    console.log("✅ Таблица ai_model_photos доступна, найдено записей:", photos?.length || 0);
    
    return NextResponse.json({
      success: true,
      photosCount: photos?.length || 0,
      samplePhotos: photos?.slice(0, 3) || [],
      message: "Table ai_model_photos is accessible"
    });
    
  } catch (error) {
    console.error("�� Критическая ошибка:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
