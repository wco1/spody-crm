import { supabase } from './supabase';

export interface TrafficData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  ref?: string;
  referrer?: string;
  timestamp?: number;
}

// Функция для получения данных трекинга из cookies
export function getTrackingDataFromCookies(): TrafficData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const trackingCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('tracking_data='));
    
    if (!trackingCookie) return null;
    
    const trackingData = JSON.parse(decodeURIComponent(trackingCookie.split('=')[1]));
    return trackingData;
  } catch (error) {
    console.error('Ошибка получения данных трекинга:', error);
    return null;
  }
}

// Функция для сохранения источника трафика при регистрации
export async function saveUserTrafficSource(userId: string): Promise<void> {
  try {
    const trackingData = getTrackingDataFromCookies();
    
    if (!trackingData) {
      console.log('Нет данных трекинга для сохранения');
      return;
    }

    // Определяем категорию источника
    const referrerCategory = categorizeTrafficSource(trackingData);
    
    // Ищем соответствующую трекинговую ссылку
    let trackingLinkId = null;
    if (trackingData.ref) {
      const { data: trackingLink } = await supabase
        .from('tracking_links')
        .select('id')
        .eq('code', trackingData.ref)
        .single();
      
      trackingLinkId = trackingLink?.id;
    }

    // Сохраняем данные в базу
    const { error } = await supabase
      .from('user_traffic_sources')
      .insert({
        user_id: userId,
        utm_source: trackingData.utm_source,
        utm_medium: trackingData.utm_medium,
        utm_campaign: trackingData.utm_campaign,
        utm_content: trackingData.utm_content,
        utm_term: trackingData.utm_term,
        referrer_url: trackingData.referrer,
        referrer_category: referrerCategory,
        tracking_link_id: trackingLinkId,
        first_visit_at: trackingData.timestamp ? new Date(trackingData.timestamp) : new Date()
      });

    if (error) {
      console.error('Ошибка сохранения источника трафика:', error);
    } else {
      console.log('Источник трафика успешно сохранен:', referrerCategory);
      
      // Очищаем cookie после сохранения
      document.cookie = 'tracking_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  } catch (error) {
    console.error('Ошибка в saveUserTrafficSource:', error);
  }
}

// Функция для категоризации источника трафика
function categorizeTrafficSource(trackingData: TrafficData): string {
  const source = trackingData.utm_source?.toLowerCase();
  const medium = trackingData.utm_medium?.toLowerCase();
  const referrer = trackingData.referrer?.toLowerCase();

  // Если есть UTM-источник, используем его
  if (source) {
    // Социальные сети
    if (['facebook', 'instagram', 'twitter', 'linkedin', 'vk', 'telegram', 'youtube', 'tiktok'].includes(source)) {
      return 'Соцсети';
    }
    
    // Поисковые системы
    if (['google', 'yandex', 'bing', 'yahoo', 'duckduckgo'].includes(source)) {
      return 'Поиск';
    }
    
    // Email рассылки
    if (source === 'email' || medium === 'email') {
      return 'Email';
    }
    
    // Реферальные ссылки
    if (medium === 'referral' || source.includes('referral')) {
      return 'Рефералы';
    }
    
    // Платная реклама
    if (['cpc', 'ppc', 'paid', 'ads'].includes(medium || '')) {
      return 'Реклама';
    }
    
    return 'Другие';
  }

  // Если нет UTM, анализируем referrer
  if (referrer) {
    if (referrer.includes('google') || referrer.includes('yandex') || referrer.includes('bing')) {
      return 'Поиск';
    }
    
    if (referrer.includes('facebook') || referrer.includes('instagram') || 
        referrer.includes('twitter') || referrer.includes('vk') || 
        referrer.includes('telegram') || referrer.includes('youtube')) {
      return 'Соцсети';
    }
    
    return 'Рефералы';
  }

  // Если ничего не определено
  return 'Прямые переходы';
}

// Функция для получения статистики источников трафика
export async function getTrafficSourcesStats(): Promise<Array<{name: string, value: number}>> {
  try {
    const { data, error } = await supabase
      .from('user_traffic_sources')
      .select('referrer_category');

    if (error) {
      console.error('Ошибка получения статистики источников:', error);
      return [];
    }

    // Группируем по категориям
    const sourcesCount = (data || []).reduce((acc: Record<string, number>, item) => {
      const category = item.referrer_category || 'Не указано';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    // Преобразуем в нужный формат и сортируем
    return Object.entries(sourcesCount)
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value);
  } catch (error) {
    console.error('Ошибка в getTrafficSourcesStats:', error);
    return [];
  }
} 