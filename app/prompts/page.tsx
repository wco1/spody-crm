'use client';

import { useState, useEffect } from 'react';
import { supabaseAdmin as supabase } from '../utils/supabase';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Copy,
  Settings,
  FileText,
  Target,
  X
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  description: string;
  category: string;
  is_default: boolean;
  variables: string[] | string; // Может быть строкой или массивом
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

const categories = {
  general: { label: 'Общие', color: 'badge-primary' },
  dating: { label: 'Знакомства', color: 'badge-error' },
  casual: { label: 'Дружеский', color: 'badge-secondary' },
  roleplay: { label: 'Ролевые', color: 'badge-warning' }
};

export default function PromptsPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<PromptTemplate | null>(null);

  // Форма для создания/редактирования
  const [formData, setFormData] = useState({
    name: '',
    template: '',
    description: '',
    category: 'general',
    is_default: false,
    variables: [] as string[],
    is_active: true
  });

  // Утилита для безопасного парсинга variables
  const parseVariables = (variables: string[] | string | any): string[] => {
    if (Array.isArray(variables)) {
      return variables;
    }
    if (typeof variables === 'string') {
      try {
        const parsed = JSON.parse(variables);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('prompts_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Обрабатываем variables для каждого шаблона
      const processedData = (data || []).map(template => ({
        ...template,
        variables: parseVariables(template.variables)
      }));
      
      setTemplates(processedData);
    } catch (error) {
      console.error('Ошибка загрузки шаблонов:', error);
      toast.error('Ошибка загрузки шаблонов');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const templateData = {
        ...formData,
        variables: JSON.stringify(formData.variables)
      };

      if (editingTemplate) {
        // Обновление
        const { error } = await supabase
          .from('prompts_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast.success('Шаблон обновлен');
      } else {
        // Создание
        const { error } = await supabase
          .from('prompts_templates')
          .insert([templateData]);

        if (error) throw error;
        toast.success('Шаблон создан');
      }

      loadTemplates();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      toast.error('Ошибка сохранения шаблона');
    }
  };

  const handleDelete = async (template: PromptTemplate) => {
    if (!confirm(`Удалить шаблон "${template.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('prompts_templates')
        .delete()
        .eq('id', template.id);

      if (error) throw error;
      toast.success('Шаблон удален');
      loadTemplates();
    } catch (error) {
      console.error('Ошибка удаления:', error);
      toast.error('Ошибка удаления шаблона');
    }
  };

  const handleSetDefault = async (template: PromptTemplate) => {
    try {
      // Сначала убираем флаг default у всех шаблонов этой категории
      await supabase
        .from('prompts_templates')
        .update({ is_default: false })
        .eq('category', template.category);

      // Затем устанавливаем default для выбранного
      const { error } = await supabase
        .from('prompts_templates')
        .update({ is_default: true })
        .eq('id', template.id);

      if (error) throw error;
      toast.success(`"${template.name}" установлен как шаблон по умолчанию`);
      loadTemplates();
    } catch (error) {
      console.error('Ошибка установки по умолчанию:', error);
      toast.error('Ошибка установки шаблона по умолчанию');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      template: '',
      description: '',
      category: 'general',
      is_default: false,
      variables: [],
      is_active: true
    });
    setEditingTemplate(null);
  };

  const openEditDialog = (template?: PromptTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        template: template.template,
        description: template.description,
        category: template.category,
        is_default: template.is_default,
        variables: parseVariables(template.variables),
        is_active: template.is_active
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const renderPreview = (template: string, variables: string[]) => {
    let preview = template;
    variables.forEach(variable => {
      preview = preview.replace(
        new RegExp(`\\$\\{${variable}\\}`, 'g'), 
        `[${variable}]`
      );
    });
    return preview;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Загрузка шаблонов...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Toaster position="top-right" />
      
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Шаблоны промптов
          </h1>
          <p className="text-gray-600 mt-2">
            Управление системными промптами для AI моделей
          </p>
        </div>
        
        <button 
          onClick={() => openEditDialog()} 
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Создать шаблон
        </button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(categories).map(([key, cat]) => {
          const count = templates.filter(t => t.category === key).length;
          const defaultTemplate = templates.find(t => t.category === key && t.is_default);
          
          return (
            <div key={key} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{cat.label}</p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
                <span className={`badge ${cat.color}`}>
                  {defaultTemplate?.name || 'Нет по умолчанию'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Список шаблонов */}
      <div className="grid gap-4">
        {templates.map((template) => {
          const templateVariables = parseVariables(template.variables);
          
          return (
            <div key={template.id} className={`card ${!template.is_active ? 'opacity-50' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-medium">{template.name}</h3>
                    <span className={`badge ${categories[template.category as keyof typeof categories]?.color}`}>
                      {categories[template.category as keyof typeof categories]?.label}
                    </span>
                    {template.is_default && (
                      <span className="badge badge-success">
                        По умолчанию
                      </span>
                    )}
                    {!template.is_active && (
                      <span className="badge bg-gray-100 text-gray-500">
                        Неактивен
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">{template.description}</p>
                  
                  {templateVariables && templateVariables.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      <span className="text-xs text-gray-500">Переменные:</span>
                      {templateVariables.map((variable, idx) => (
                        <span key={idx} className="badge bg-gray-100 text-gray-600 text-xs">
                          ${variable}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    className="btn-outline"
                    onClick={() => setPreviewTemplate(template)}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  {!template.is_default && (
                    <button
                      className="btn-outline"
                      onClick={() => handleSetDefault(template)}
                    >
                      <Target className="h-4 w-4" />
                    </button>
                  )}
                  
                  <button
                    className="btn-outline"
                    onClick={() => openEditDialog(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  
                  <button
                    className="btn-outline text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(template)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                {template.template.length > 200 
                  ? template.template.substring(0, 200) + '...'
                  : template.template
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* Диалог создания/редактирования */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                {editingTemplate ? 'Редактировать шаблон' : 'Создать шаблон'}
              </h2>
              <button onClick={() => setIsDialogOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Название */}
              <div>
                <label className="block text-sm font-medium mb-2">Название</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Название шаблона"
                />
              </div>

              {/* Категория */}
              <div>
                <label className="block text-sm font-medium mb-2">Категория</label>
                <select 
                  className="input" 
                  value={formData.category} 
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  {Object.entries(categories).map(([key, cat]) => (
                    <option key={key} value={key}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Описание */}
              <div>
                <label className="block text-sm font-medium mb-2">Описание</label>
                <input
                  type="text"
                  className="input"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Краткое описание шаблона"
                />
              </div>

              {/* Шаблон промпта */}
              <div>
                <label className="block text-sm font-medium mb-2">Шаблон промпта</label>
                <textarea
                  className="input"
                  rows={6}
                  value={formData.template}
                  onChange={(e) => setFormData({...formData, template: e.target.value})}
                  placeholder="Текст промпта. Используйте ${переменная} для подстановки значений"
                />
              </div>

              {/* Превью */}
              {formData.template && (
                <div>
                  <label className="block text-sm font-medium mb-2">Превью</label>
                  <div className="bg-gray-50 p-3 rounded border text-sm">
                    {renderPreview(formData.template, formData.variables)}
                  </div>
                </div>
              )}

              {/* Переменные */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Переменные 
                  <span className="text-gray-500 text-xs ml-1">
                    (через запятую: characterName, traits, interests)
                  </span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.variables.join(', ')}
                  onChange={(e) => setFormData({
                    ...formData, 
                    variables: e.target.value.split(',').map(v => v.trim()).filter(v => v)
                  })}
                  placeholder="characterName, traits, interests"
                />
              </div>

              {/* Флаги */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({...formData, is_default: e.target.checked})}
                  />
                  <span className="text-sm">По умолчанию для категории</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  />
                  <span className="text-sm">Активен</span>
                </label>
              </div>

              {/* Кнопки */}
              <div className="flex justify-end gap-2 pt-4">
                <button 
                  className="btn-outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Отмена
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleSave}
                >
                  {editingTemplate ? 'Обновить' : 'Создать'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Диалог превью */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Превью: {previewTemplate.name}</h2>
              <button onClick={() => setPreviewTemplate(null)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Полный текст промпта</label>
                <div className="bg-gray-50 p-4 rounded text-sm font-mono max-h-96 overflow-y-auto">
                  {previewTemplate.template}
                </div>
              </div>
              
              {parseVariables(previewTemplate.variables).length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">С подстановкой переменных</label>
                  <div className="bg-blue-50 p-4 rounded text-sm">
                    {renderPreview(previewTemplate.template, parseVariables(previewTemplate.variables))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {templates.length === 0 && (
        <div className="card text-center py-8">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            Нет шаблонов промптов
          </h3>
          <p className="text-gray-500 mb-4">
            Создайте первый шаблон промпта для AI моделей
          </p>
          <button onClick={() => openEditDialog()} className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Создать первый шаблон
          </button>
        </div>
      )}
    </div>
  );
} 