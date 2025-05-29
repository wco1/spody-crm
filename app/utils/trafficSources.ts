import { supabase } from './supabase';

// Типы для источников трафика
export interface TrafficSource {
  id: string;
  user_id: string;
  session_id: string;
  referrer_url?: string;
  referrer_category?: string;
  landing_page?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  user_agent?: string;
  ip_address?: string;
  browser_language?: string;
  screen_resolution?: string;
  created_at: string;
  updated_at: string;
}

export interface TrafficSourceData {
  referrer_category: string;
  referrer_url?: string;
  landing_page: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  user_agent: string;
  browser_language: string;
  screen_resolution: string;
}

export interface TrafficSourceStats {
  name: string;
  value: number;
  percentage: number;
}

// Функция для определения категории источника по URL
export function getReferrerCategory(referrer: string): string {
  if (!referrer) return 'Прямой переход';
  
  const url = referrer.toLowerCase();
  
  // Поисковые системы
  if (url.includes('google.com') || url.includes('google.ru')) return 'Google';
  if (url.includes('yandex.ru') || url.includes('yandex.com')) return 'Яндекс';
  if (url.includes('bing.com')) return 'Bing';
  if (url.includes('mail.ru')) return 'Mail.ru';
  if (url.includes('rambler.ru')) return 'Rambler';
  
  // Социальные сети
  if (url.includes('vk.com') || url.includes('vkontakte.ru')) return 'ВКонтакте';
  if (url.includes('facebook.com') || url.includes('fb.com')) return 'Facebook';
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('telegram.org') || url.includes('t.me')) return 'Telegram';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'Twitter';
  if (url.includes('tiktok.com')) return 'TikTok';
  if (url.includes('youtube.com')) return 'YouTube';
  if (url.includes('ok.ru') || url.includes('odnoklassniki.ru')) return 'Одноклассники';
  
  // Мессенджеры
  if (url.includes('whatsapp.com')) return 'WhatsApp';
  if (url.includes('viber.com')) return 'Viber';
  
  // Форумы и блоги
  if (url.includes('habr.com')) return 'Habr';
  if (url.includes('pikabu.ru')) return 'Pikabu';
  if (url.includes('reddit.com')) return 'Reddit';
  
  // Email
  if (url.includes('mail.') || url.includes('webmail') || url.includes('email')) return 'Email';
  
  return 'Другой сайт';
}

// Функция для захвата данных источника трафика
export function captureTrafficSource(): TrafficSourceData {
  const urlParams = new URLSearchParams(window.location.search);
  const referrer = document.referrer;
  
  return {
    referrer_category: getReferrerCategory(referrer),
    referrer_url: referrer || undefined,
    landing_page: window.location.pathname + window.location.search,
    utm_source: urlParams.get('utm_source') || undefined,
    utm_medium: urlParams.get('utm_medium') || undefined,
    utm_campaign: urlParams.get('utm_campaign') || undefined,
    utm_term: urlParams.get('utm_term') || undefined,
    utm_content: urlParams.get('utm_content') || undefined,
    user_agent: navigator.userAgent,
    browser_language: navigator.language,
    screen_resolution: `${screen.width}x${screen.height}`
  };
}

// Генерация уникального ID сессии
export function generateSessionId(): string {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Сохранение источника трафика в базу данных
export async function saveTrafficSource(
  userId: string, 
  trafficData?: TrafficSourceData
): Promise<{ success: boolean; error?: string }> {
  try {
    const data = trafficData || captureTrafficSource();
    const sessionId = generateSessionId();
    
    console.log('💾 Сохранение источника трафика:', {
      user_id: userId,
      session_id: sessionId,
      referrer_category: data.referrer_category,
      utm_source: data.utm_source
    });
    
    const { error } = await supabase
      .from('user_traffic_sources')
      .insert({
        user_id: userId,
        session_id: sessionId,
        referrer_url: data.referrer_url,
        referrer_category: data.referrer_category,
        landing_page: data.landing_page,
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        utm_term: data.utm_term,
        utm_content: data.utm_content,
        user_agent: data.user_agent,
        browser_language: data.browser_language,
        screen_resolution: data.screen_resolution
      });
    
    if (error) {
      console.error('❌ Ошибка сохранения источника трафика:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Источник трафика сохранён успешно');
    return { success: true };
  } catch (error) {
    console.error('❌ Критическая ошибка при сохранении источника:', error);
    return { success: false, error: 'Неизвестная ошибка' };
  }
}

// Получение статистики источников трафика
export async function getTrafficSourcesStats(): Promise<TrafficSourceStats[]> {
  try {
    console.log('📊 Получение статистики источников трафика');
    
    const { data, error } = await supabase
      .from('user_traffic_sources')
      .select('referrer_category');
    
    if (error) {
      console.error('❌ Ошибка получения статистики:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ Нет данных об источниках трафика');
      return [];
    }
    
    // Подсчитываем статистику
    const sourcesCount = data.reduce((acc: Record<string, number>, item) => {
      const category = item.referrer_category || 'Не указано';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    
    const total = data.length;
    
    // Преобразуем в формат для графика
    return Object.entries(sourcesCount)
      .map(([name, count]) => ({
        name,
        value: count,
        percentage: Math.round((count / total) * 100 * 10) / 10
      }))
      .sort((a, b) => b.value - a.value);
    
  } catch (error) {
    console.error('❌ Критическая ошибка получения статистики:', error);
    return [];
  }
}

// Получение детальной статистики UTM кампаний
export async function getUTMCampaignsStats(): Promise<Array<{
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  created_at: string;
}>> {
  try {
    console.log('📈 Получение статистики UTM кампаний');
    
    const { data, error } = await supabase
      .from('user_traffic_sources')
      .select('utm_source, utm_medium, utm_campaign, created_at')
      .not('utm_source', 'is', null);
    
    if (error) {
      console.error('❌ Ошибка получения UTM статистики:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ Критическая ошибка получения UTM статистики:', error);
    return [];
  }
}

// Получение истории источников для конкретного пользователя
export async function getUserTrafficHistory(userId: string): Promise<TrafficSource[]> {
  try {
    console.log('👤 Получение истории источников для пользователя:', userId);
    
    const { data, error } = await supabase
      .from('user_traffic_sources')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Ошибка получения истории:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ Критическая ошибка получения истории:', error);
    return [];
  }
}

// Получение статистики за период
export async function getTrafficSourcesByPeriod(
  days: number = 30
): Promise<{ daily: Array<{ date: string; count: number }>; sources: TrafficSourceStats[] }> {
  try {
    console.log(`📅 Получение статистики за последние ${days} дней`);
    
    const { data, error } = await supabase
      .from('user_traffic_sources')
      .select('referrer_category, created_at')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
    
    if (error) {
      console.error('❌ Ошибка получения статистики по периоду:', error);
      return { daily: [], sources: [] };
    }
    
    if (!data || data.length === 0) {
      return { daily: [], sources: [] };
    }
    
    // Группируем по дням
    const dailyStats = data.reduce((acc: Record<string, number>, item) => {
      const date = new Date(item.created_at).toDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    
    const daily = Object.entries(dailyStats).map(([date, count]) => ({
      date,
      count
    }));
    
    // Группируем по источникам
    const sourcesCount = data.reduce((acc: Record<string, number>, item) => {
      const category = item.referrer_category || 'Не указано';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    
    const total = data.length;
    const sources = Object.entries(sourcesCount)
      .map(([name, count]) => ({
        name,
        value: count,
        percentage: Math.round((count / total) * 100 * 10) / 10
      }))
      .sort((a, b) => b.value - a.value);
    
    return { daily, sources };
  } catch (error) {
    console.error('❌ Критическая ошибка получения статистики по периоду:', error);
    return { daily: [], sources: [] };
  }
}

// Отслеживание события в сессии пользователя
export async function trackUserEvent(
  eventName: string, 
  eventData?: Record<string, unknown>
): Promise<void> {
  try {
    console.log('📝 Отслеживание события:', eventName, eventData);
    
    // Здесь можно добавить логику для отслеживания событий
    // Например, сохранение в отдельную таблицу user_events
    
    // Для интеграции с внешними системами
    if (typeof window !== 'undefined') {
      // Google Analytics
      const windowWithGtag = window as typeof window & { gtag?: (command: string, eventName: string, parameters?: Record<string, unknown>) => void };
      if (typeof windowWithGtag.gtag !== 'undefined') {
        windowWithGtag.gtag('event', eventName, eventData);
      }
      
      // Яндекс.Метрика
      const windowWithYM = window as typeof window & { ym?: (id: number, method: string, target: string, parameters?: Record<string, unknown>) => void };
      if (typeof windowWithYM.ym !== 'undefined') {
        windowWithYM.ym(0, 'reachGoal', eventName, eventData);
      }
    }
  } catch (error) {
    console.error('❌ Ошибка отслеживания события:', error);
  }
} 