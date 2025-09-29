import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Remplace ici par ta vraie clé Supabase anon (Settings > API > anon public)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dWFjdGpzdW5sa25wbW5jZGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwMjc2ODEsImV4cCI6MjA1OTYwMzY4MX0.jIhVY1dnsiinNAFNh1hNOr4q58g1meBV6hZadyXIUQ0';

router.post('/openai', async (req, res) => {
  try {
    const { apiKey, prompt } = req.body;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-client-authorization': SUPABASE_ANON_KEY
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
      throw new Error(`OpenAI Error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json({ text: data.choices[0]?.message?.content });
  } catch (error) {
    console.error('OpenAI error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/claude', async (req, res) => {
  try {
    const { apiKey, prompt } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'x-client-authorization': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        model: "claude-2",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude Error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json({ text: data.content[0].text });
  } catch (error) {
    console.error('Claude error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/mistral', async (req, res) => {
  try {
    const { apiKey, prompt } = req.body;

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-client-authorization': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        model: "mistral-small",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Mistral Error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json({ text: data.choices[0]?.message?.content });
  } catch (error) {
    console.error('Mistral error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
