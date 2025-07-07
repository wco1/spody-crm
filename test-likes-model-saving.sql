-- Тест сохранения поля is_likes_model

-- 1. Проверяем текущее состояние
SELECT id, name, is_likes_model 
FROM ai_models 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Обновляем одну модель как лайк-модель
UPDATE ai_models 
SET is_likes_model = true 
WHERE id = (
  SELECT id FROM ai_models 
  WHERE is_likes_model = false OR is_likes_model IS NULL
  LIMIT 1
);

-- 3. Проверяем что изменение сохранилось
SELECT id, name, is_likes_model 
FROM ai_models 
WHERE is_likes_model = true
ORDER BY created_at DESC;

-- 4. Подсчитываем лайк-модели
SELECT COUNT(*) as likes_models_count 
FROM ai_models 
WHERE is_likes_model = true;
