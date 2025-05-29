const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ztjkqjqjqjqjqjqjqjqj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Замените на ваш ключ

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTrackingSystem() {
  console.log('🧪 Тестирование системы трекинга...\n');

  try {
    // 1. Создаем тестовые трекинговые ссылки
    console.log('1️⃣ Создание тестовых трекинговых ссылок...');
    
    const testLinks = [
      {
        name: 'Facebook Реклама',
        code: 'fb_test_001',
        source: 'facebook',
        medium: 'cpc',
        campaign: 'summer_2024',
        content: 'banner_top',
        url: 'http://localhost:3000?utm_source=facebook&utm_medium=cpc&utm_campaign=summer_2024&utm_content=banner_top&ref=fb_test_001',
        is_active: true
      },
      {
        name: 'Google Ads',
        code: 'google_001',
        source: 'google',
        medium: 'cpc',
        campaign: 'brand_keywords',
        url: 'http://localhost:3000?utm_source=google&utm_medium=cpc&utm_campaign=brand_keywords&ref=google_001',
        is_active: true
      },
      {
        name: 'Telegram канал',
        code: 'tg_channel',
        source: 'telegram',
        medium: 'social',
        campaign: 'organic_post',
        url: 'http://localhost:3000?utm_source=telegram&utm_medium=social&utm_campaign=organic_post&ref=tg_channel',
        is_active: true
      }
    ];

    for (const link of testLinks) {
      const { data, error } = await supabase
        .from('tracking_links')
        .insert(link)
        .select();
      
      if (error) {
        console.log(`❌ Ошибка создания ссылки ${link.name}:`, error.message);
      } else {
        console.log(`✅ Создана ссылка: ${link.name} (${link.code})`);
      }
    }

    // 2. Создаем тестовые данные источников трафика
    console.log('\n2️⃣ Создание тестовых данных источников трафика...');
    
    // Получаем существующих пользователей
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .limit(10);

    if (usersError || !users || users.length === 0) {
      console.log('❌ Нет пользователей для тестирования');
      return;
    }

    // Получаем созданные трекинговые ссылки
    const { data: trackingLinks } = await supabase
      .from('tracking_links')
      .select('id, code, source');

    const trafficSources = [
      { category: 'Соцсети', utm_source: 'facebook', utm_medium: 'social' },
      { category: 'Поиск', utm_source: 'google', utm_medium: 'organic' },
      { category: 'Поиск', utm_source: 'yandex', utm_medium: 'organic' },
      { category: 'Соцсети', utm_source: 'telegram', utm_medium: 'social' },
      { category: 'Соцсети', utm_source: 'instagram', utm_medium: 'social' },
      { category: 'Прямые переходы', utm_source: null, utm_medium: null },
      { category: 'Рефералы', utm_source: 'partner_site', utm_medium: 'referral' },
      { category: 'Email', utm_source: 'newsletter', utm_medium: 'email' },
      { category: 'Реклама', utm_source: 'google', utm_medium: 'cpc' },
      { category: 'Другие', utm_source: 'unknown', utm_medium: 'unknown' }
    ];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const sourceData = trafficSources[i % trafficSources.length];
      
      // Ищем подходящую трекинговую ссылку
      let trackingLinkId = null;
      if (trackingLinks && sourceData.utm_source) {
        const matchingLink = trackingLinks.find(link => 
          link.source.toLowerCase() === sourceData.utm_source.toLowerCase()
        );
        trackingLinkId = matchingLink?.id;
      }

      const trafficRecord = {
        user_id: user.id,
        tracking_link_id: trackingLinkId,
        utm_source: sourceData.utm_source,
        utm_medium: sourceData.utm_medium,
        utm_campaign: sourceData.utm_source === 'facebook' ? 'summer_2024' : null,
        referrer_category: sourceData.category,
        first_visit_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Случайная дата за последние 30 дней
      };

      const { error } = await supabase
        .from('user_traffic_sources')
        .insert(trafficRecord);

      if (error) {
        console.log(`❌ Ошибка создания записи для пользователя ${i + 1}:`, error.message);
      } else {
        console.log(`✅ Создана запись источника: ${sourceData.category} для пользователя ${i + 1}`);
      }
    }

    // 3. Проверяем статистику
    console.log('\n3️⃣ Проверка статистики...');
    
    const { data: stats, error: statsError } = await supabase
      .from('user_traffic_sources')
      .select('referrer_category');

    if (statsError) {
      console.log('❌ Ошибка получения статистики:', statsError.message);
    } else {
      const categoryStats = stats.reduce((acc, item) => {
        const category = item.referrer_category || 'Не указано';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});

      console.log('\n📊 Статистика по источникам:');
      Object.entries(categoryStats)
        .sort(([,a], [,b]) => b - a)
        .forEach(([category, count]) => {
          console.log(`   ${category}: ${count} пользователей`);
        });
    }

    // 4. Проверяем трекинговые ссылки
    console.log('\n4️⃣ Статистика трекинговых ссылок...');
    
    const { data: linkStats } = await supabase
      .from('tracking_links')
      .select(`
        name,
        code,
        source,
        user_traffic_sources(count)
      `);

    if (linkStats) {
      console.log('\n🔗 Статистика по ссылкам:');
      linkStats.forEach(link => {
        const clicks = link.user_traffic_sources?.[0]?.count || 0;
        console.log(`   ${link.name} (${link.code}): ${clicks} переходов`);
      });
    }

    console.log('\n✅ Тестирование завершено успешно!');
    console.log('\n📝 Следующие шаги:');
    console.log('   1. Выполните SQL скрипт database-setup.sql в Supabase');
    console.log('   2. Перейдите на страницу /tracking для управления ссылками');
    console.log('   3. Проверьте аналитику на странице /analytics');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

// Запускаем тест
testTrackingSystem(); 