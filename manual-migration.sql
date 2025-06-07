-- Упрощенная миграция для выполнения в Supabase SQL Editor
-- Шаг 1: Создание таблицы prompts_templates

CREATE TABLE IF NOT EXISTS prompts_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    template TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_default BOOLEAN DEFAULT FALSE,
    variables JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT TRUE
);

-- Шаг 2: Добавление полей в ai_models
ALTER TABLE ai_models 
    ADD COLUMN IF NOT EXISTS prompt_template_id UUID REFERENCES prompts_templates(id),
    ADD COLUMN IF NOT EXISTS custom_prompt TEXT,
    ADD COLUMN IF NOT EXISTS use_custom_prompt BOOLEAN DEFAULT FALSE;

-- Шаг 3: Индексы
CREATE INDEX IF NOT EXISTS idx_prompts_templates_category ON prompts_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompts_templates_is_default ON prompts_templates(is_default);
CREATE INDEX IF NOT EXISTS idx_prompts_templates_is_active ON prompts_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_models_prompt_template ON ai_models(prompt_template_id);

-- Шаг 4: Заполнение базовых шаблонов
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
ON CONFLICT DO NOTHING;

-- Шаг 5: RLS политики
ALTER TABLE prompts_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage prompts_templates"
    ON prompts_templates
    FOR ALL
    USING (auth.jwt() ->> 'email' IN (
        'kowalski.wlad@gmail.com',
        'admin@spody.app'
    ));

CREATE POLICY "Authenticated can read active prompts_templates"
    ON prompts_templates
    FOR SELECT
    USING (is_active = TRUE);

-- Шаг 6: Обновление существующих моделей
UPDATE ai_models 
SET prompt_template_id = (
    SELECT id FROM prompts_templates 
    WHERE category = 'dating' AND is_default = TRUE 
    LIMIT 1
),
use_custom_prompt = FALSE
WHERE prompt_template_id IS NULL; 