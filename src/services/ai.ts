import { supabase } from '../lib/supabase';

interface AIProvider {
  provider: string;
  key: string;
  priority: number;
}

interface AIResponse {
  text: string;
  provider: string;
}

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dWFjdGpzdW5sa25wbW5jZGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwMjc2ODEsImV4cCI6MjA1OTYwMzY4MX0.jIhVY1dnsiinNAFNh1hNOr4q58g1meBV6hZadyXIUQ0';

async function callAIProvider(provider: AIProvider, prompt: string): Promise<string> {
  const response = await fetch('https://byuactjsunlknpmncdlw.functions.supabase.co/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      provider: provider.provider?.toLowerCase().trim(),
      apiKey: provider.key,
      prompt
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error || response.statusText;
    throw new Error(`Edge Function returned ${response.status}: ${errorMessage}`);
  }

  const data = await response.json();
  return data.text;
}

export async function generateEmailContent(
  prompt: string,
  context: {
    tone: string;
    urgency: string;
    additionalInfo?: string;
  }
): Promise<AIResponse> {
  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('config')
    .eq('type', 'ai')
    .single();

  if (settingsError) {
    throw new Error('Failed to load AI settings');
  }

  const apiKeys = settings?.config?.api_keys || [];
  if (apiKeys.length === 0) {
    throw new Error('No API keys configured');
  }

  const providers = [...apiKeys].sort((a, b) => a.priority - b.priority);

  const enhancedPrompt = `
    ${prompt}
    
    Ton souhaité: ${context.tone}
    Niveau d'urgence: ${context.urgency}
    ${context.additionalInfo ? `Informations supplémentaires: ${context.additionalInfo}` : ''}
  `;

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      const result = await callAIProvider(provider, enhancedPrompt);
      if (result) {
        return {
          text: result,
          provider: provider.provider
        };
      }
    } catch (error) {
      console.error(`Error with ${provider.provider}:`, error);
      lastError = error instanceof Error ? error : new Error('Unknown error');
      continue;
    }
  }

  throw new Error('All AI providers failed: ' + (lastError?.message || 'Unknown error'));
}
