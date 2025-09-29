import React, { useState, useEffect } from 'react';
import { X, Bot, Loader, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AIEmailAssistantProps {
  onClose: () => void;
  onGenerate: (text: string) => void;
  clientName: string;
  documentType: 'transport' | 'freight' | 'invoice';
  documentNumber: string;
  currentText?: string;
  mode?: 'generate' | 'improve';
}

interface FormField {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  options?: string[];
  type?: 'text' | 'select';
}

export default function AIEmailAssistant({
  onClose,
  onGenerate,
  clientName,
  documentType,
  documentNumber,
  currentText,
  mode = 'generate'
}: AIEmailAssistantProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([
    {
      id: 'subject',
      label: 'Objet du mail',
      value: '',
      placeholder: 'Ex: Envoi de facture, Confirmation de commande...'
    },
    {
      id: 'documentType',
      label: 'Type de document concerné',
      value: documentType === 'transport' ? 'bordereau' : 
             documentType === 'freight' ? 'bordereau' : 
             documentType === 'invoice' ? 'facture' : 'document',
      type: 'select',
      options: ['facture', 'devis', 'bordereau', 'avoir', 'aucun document']
    },
    {
      id: 'clientName',
      label: 'Nom du client',
      value: clientName,
      placeholder: 'Nom du client'
    },
    {
      id: 'clientCompany',
      label: 'Société du client',
      value: clientName,
      placeholder: 'Nom de la société'
    },
    {
      id: 'tone',
      label: 'Ton souhaité',
      value: 'standard',
      type: 'select',
      options: ['formel', 'standard', 'amical mais pro']
    },
    {
      id: 'purpose',
      label: 'But du mail (1 phrase)',
      value: '',
      placeholder: 'Ex: Informer le client de la livraison'
    },
    {
      id: 'keyPoints',
      label: 'Points clés à inclure',
      value: '',
      placeholder: 'Ex: Date de livraison, numéro de commande...'
    }
  ]);

  useEffect(() => {
    if (mode === 'improve' && currentText) {
      // Si on est en mode amélioration, on génère directement
      generateEmail();
    }
  }, []);

  const callAIProvider = async (provider: string, apiKey: string, prompt: string) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Tu es un assistant qui aide à rédiger des emails professionnels en français."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur OpenAI: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content;
  };

  const generateEmail = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get AI settings
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('config')
        .eq('type', 'ai')
        .single();

      if (settingsError) throw settingsError;

      let prompt;
      if (mode === 'improve') {
        prompt = `Améliore ce mail tout en gardant le même sens et le même ton professionnel:\n\n${currentText}`;
      } else {
        // Construire le prompt avec les champs du formulaire
        const fieldValues = formFields.reduce((acc, field) => {
          acc[field.id] = field.value;
          return acc;
        }, {} as Record<string, string>);
        
        prompt = `Rédige un email professionnel avec les caractéristiques suivantes:

Objet: ${fieldValues.subject || `Envoi de ${fieldValues.documentType} ${documentNumber}`}
Type de document: ${fieldValues.documentType}
${fieldValues.documentType !== 'aucun document' ? `Numéro de document: ${documentNumber}` : ''}
Client: ${fieldValues.clientName}
Société: ${fieldValues.clientCompany}
Ton: ${fieldValues.tone}
But du mail: ${fieldValues.purpose || `Envoyer le ${fieldValues.documentType} au client`}
Points clés à inclure: ${fieldValues.keyPoints || 'Aucun point spécifique'}

L'email doit être professionnel, concis et efficace. Ne pas inclure de formule de signature, elle sera ajoutée séparément.
Ne pas mentionner que ce contenu a été généré par une IA.`;
      }

      const apiKeys = settings?.config?.api_keys || [];
      if (apiKeys.length === 0) {
        throw new Error('Aucune clé API n\'est configurée');
      }

      // Sort API keys by priority
      const sortedKeys = [...apiKeys].sort((a, b) => a.priority - b.priority);

      // Try each API key in order until one works
      let lastError = null;
      for (const apiKey of sortedKeys) {
        try {
          const result = await callAIProvider(apiKey.provider, apiKey.key, prompt);
          if (result) {
            onGenerate(result);
            onClose();
            return;
          }
        } catch (err) {
          lastError = err;
          console.error(`Error with ${apiKey.provider}:`, err);
          continue; // Try next API key
        }
      }

      // If we get here, all API keys failed
      throw lastError || new Error('Toutes les API ont échoué');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (id: string, value: string) => {
    setFormFields(fields => 
      fields.map(field => 
        field.id === id ? { ...field, value } : field
      )
    );
  };

  const handleSubmit = () => {
    // Vérifier si tous les champs obligatoires sont remplis
    const requiredFields = ['clientName', 'clientCompany'];
    const missingFields = requiredFields.filter(id => {
      const field = formFields.find(f => f.id === id);
      return !field?.value;
    });
    
    if (missingFields.length > 0) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    generateEmail();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bot className="text-blue-600" />
            Assistant IA
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          {loading && (
            <div className="text-center py-8">
              <Loader size={48} className="mx-auto mb-4 text-blue-600 animate-spin" />
              <p className="text-gray-600">Génération en cours...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {!loading && mode === 'generate' && (
            <div className="space-y-4">
              {formFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {field.label}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={field.value}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {field.options?.map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  )}
                </div>
              ))}
              
              <div className="pt-4">
                <button
                  onClick={handleSubmit}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  Générer le mail par l'IA
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}