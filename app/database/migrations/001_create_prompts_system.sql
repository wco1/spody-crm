-- Миграция: Система управления промптами
-- Создано: 2024-06-06
-- Описание: Добавляет таблицы для управления шаблонами промптов и связи с моделями

-- 1. Таблица шаблонов промптов
CREATE TABLE IF NOT EXISTS prompts_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL, -- "Короткие ответы", "Флирт", "Дружелюбный"
    template TEXT NOT NULL, -- Текст шаблона промпта
    description TEXT, -- Описание для админов
    category VARCHAR(50) DEFAULT 'general', -- "dating", "casual", "roleplay", "general"
    is_default BOOLEAN DEFAULT FALSE, -- Шаблон по умолчанию для категории
    variables JSONB DEFAULT '[]', -- Список переменных в шаблоне: ["characterName", "traits"]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id), -- Кто создал шаблон
    is_active BOOLEAN DEFAULT TRUE -- Активен ли шаблон
);

-- 2. Добавляем поля в таблицу ai_models для связи с промптами
ALTER TABLE ai_models 
    ADD COLUMN IF NOT EXISTS prompt_template_id UUID REFERENCES prompts_templates(id),
    ADD COLUMN IF NOT EXISTS custom_prompt TEXT, -- Кастомный промпт для модели
    ADD COLUMN IF NOT EXISTS use_custom_prompt BOOLEAN DEFAULT FALSE; -- Использовать кастомный или шаблон

-- 3. Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_prompts_templates_category ON prompts_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompts_templates_is_default ON prompts_templates(is_default);
CREATE INDEX IF NOT EXISTS idx_prompts_templates_is_active ON prompts_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_models_prompt_template ON ai_models(prompt_template_id);

-- 4. Заполняем базовые шаблоны промптов
INSERT INTO prompts_templates (name, template, description, category, is_default, variables) VALUES
    (
        'Короткие ответы', 
        'отвечай одним словом',
        'Модель отвечает максимально коротко, одним словом или фразой',
        'general',
        TRUE,
        '[]'
    ),
    (
        'Очень короткие ответы',
        'Отвечай только сообщением из 3х слов',
        'Модель отвечает максимум 3 словами',
        'general',
        FALSE,
        '[]'
    ),
    (
        'Дружелюбный чат',
        'Ты дружелюбный AI-компаньон. Веди приятную беседу, отвечай тепло и позитивно. Держи ответы короткими но содержательными.',
        'Дружелюбное общение с короткими ответами',
        'casual',
        TRUE,
        '[]'
    ),
    (
        'Флирт (базовый)',
        'Ты очаровательный и игривый AI в приложении для знакомств. Флиртуй легко и непринужденно. Ответы должны быть короткими и интригующими.',
        'Легкий флирт для приложения знакомств',
        'dating',
        TRUE,
        '[]'
    ),
    (
        'Персональный флирт',
        'Ты ${characterName} в приложении для знакомств Spody AI. Твой характер: ${traits}. Твои интересы: ${interests}. Флиртуй согласно своему характеру, отвечай коротко.',
        'Персонализированный флирт с данными модели',
        'dating',
        FALSE,
        '["characterName", "traits", "interests"]'
    ),
    (
        'Ролевая игра',
        'Ты ${characterName}. ${roleDescription}. Отвечай в характере своей роли, кратко и ярко.',
        'Для ролевых персонажей',
        'roleplay',
        TRUE,
        '["characterName", "roleDescription"]'
    )
ON CONFLICT DO NOTHING; -- Не перезаписываем если уже есть

-- 5. RLS политики для prompts_templates
ALTER TABLE prompts_templates ENABLE ROW LEVEL SECURITY;

-- Админы могут делать всё
CREATE POLICY "Admins can manage prompts_templates"
    ON prompts_templates
    FOR ALL
    USING (auth.jwt() ->> 'email' IN (
        'kowalski.wlad@gmail.com',
        'admin@spody.app'
    ));

-- Все аутентифицированные могут читать активные шаблоны
CREATE POLICY "Authenticated can read active prompts_templates"
    ON prompts_templates
    FOR SELECT
    USING (is_active = TRUE);

-- 6. Обновляем существующие модели - привязываем к дефолтному шаблону
UPDATE ai_models 
SET prompt_template_id = (
    SELECT id FROM prompts_templates 
    WHERE category = 'dating' AND is_default = TRUE 
    LIMIT 1
),
use_custom_prompt = FALSE
WHERE prompt_template_id IS NULL;

-- 7. Комментарии к таблицам
COMMENT ON TABLE prompts_templates IS 'Шаблоны промптов для AI моделей';
COMMENT ON COLUMN prompts_templates.variables IS 'JSON массив переменных в шаблоне для подстановки';
COMMENT ON COLUMN ai_models.prompt_template_id IS 'Ссылка на шаблон промпта';
COMMENT ON COLUMN ai_models.custom_prompt IS 'Кастомный промпт, переопределяет шаблон если use_custom_prompt=true';
COMMENT ON COLUMN ai_models.use_custom_prompt IS 'Использовать кастомный промпт вместо шаблона'; 