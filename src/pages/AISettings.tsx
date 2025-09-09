import React, { useState, useEffect } from 'react';
import { Bot, Save, Key, Plus, Trash2 } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface APIKey {
  provider: string;
  key: string;
  priority: number;
}

export default function AISettings() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    api_keys: [] as APIKey[],
    email_prompt: '',
  });

  const isSalome = user?.name === 'Salomé';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('config')
        .eq('type', 'ai')
        .single();

      if (error) throw error;
      if (data?.config) {
        // Migrate old format if needed
        const config = data.config;
        if (config.openai_key && !config.api_keys) {
          setSettings({
            ...config,
            api_keys: [{
              provider: 'OpenAI',
              key: config.openai_key,
              priority: 1
            }]
          });
        } else {
          setSettings(config);
        }
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
      toast.error('Erreur lors du chargement des paramètres');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSalome) {
      toast.error('Accès non autorisé');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          type: 'ai',
          config: settings
        }, {
          onConflict: 'type'
        });

      if (error) throw error;
      toast.success('Paramètres enregistrés');
    } catch (error) {
      console.error('Error saving AI settings:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const addApiKey = () => {
    if (settings.api_keys.length >= 3) {
      toast.error('Maximum 3 clés API autorisées');
      return;
    }

    setSettings({
      ...settings,
      api_keys: [
        ...settings.api_keys,
        {
          provider: '',
          key: '',
          priority: settings.api_keys.length + 1
        }
      ]
    });
  };

  const removeApiKey = (index: number) => {
    const newKeys = settings.api_keys.filter((_, i) => i !== index);
    // Reorder priorities
    newKeys.forEach((key, i) => key.priority = i + 1);
    
    setSettings({
      ...settings,
      api_keys: newKeys
    });
  };

  const updateApiKey = (index: number, field: keyof APIKey, value: string | number) => {
    const newKeys = [...settings.api_keys];
    newKeys[index] = {
      ...newKeys[index],
      [field]: value
    };
    setSettings({
      ...settings,
      api_keys: newKeys
    });
  };

  if (!isSalome) {
    return (
      <div className="p-8 ml-64">
        <div className="max-w-4xl mx-auto text-center py-12">
          <Bot size={48} className="mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-700">Accès restreint</h2>
          <p className="text-gray-500 mt-2">
            Cette section est réservée à l'administrateur Salomé.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 ml-64">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <Bot className="w-8 h-8" />
          Configuration IA
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Key size={20} />
                Clés API
              </h2>
              <button
                type="button"
                onClick={addApiKey}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Plus size={16} />
                Ajouter une clé
              </button>
            </div>
            
            <div className="space-y-4">
              {settings.api_keys.map((apiKey, index) => (
                <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Fournisseur
                      </label>
                      <select
                        value={apiKey.provider}
                        onChange={(e) => updateApiKey(index, 'provider', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Sélectionner un fournisseur</option>
                        <option value="OpenAI">OpenAI</option>
                        <option value="Claude">Claude</option>
                        <option value="Mistral">Mistral</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Clé API
                      </label>
                      <input
                        type="password"
                        value={apiKey.key}
                        onChange={(e) => updateApiKey(index, 'key', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="sk-..."
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Priorité
                    </label>
                    <select
                      value={apiKey.priority}
                      onChange={(e) => updateApiKey(index, 'priority', Number(e.target.value))}
                      className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {[1, 2, 3].map(num => (
                        <option key={num} value={num}>
                          {num}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeApiKey(index)}
                      className="mt-2 text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Configuration des prompts</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Prompt pour l'assistant email
                </label>
                <textarea
                  value={settings.email_prompt}
                  onChange={(e) => setSettings({ ...settings, email_prompt: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Entrez le prompt pour l'assistant email..."
                />
                <p className="mt-2 text-sm text-gray-500">
                  Variables disponibles: {'{client}'}, {'{type_document}'}, {'{numero_document}'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={20} />
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}