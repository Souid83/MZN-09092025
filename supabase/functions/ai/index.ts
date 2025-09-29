import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { provider, apiKey, prompt } = await req.json();

    if (!provider || !apiKey || !prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const normalizedProvider = provider.trim().toLowerCase();
    let response;

    switch (normalizedProvider) {
      case "openai":
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "Tu es un assistant qui aide à rédiger des emails professionnels en français.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
          }),
        });
        break;

      case "claude":
        response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-2",
            max_tokens: 1000,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        break;

      case "mistral":
        response = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "mistral-small",
            messages: [{ role: "user", content: prompt }],
          }),
        });
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Provider "${provider}" not supported` }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
    }

    if (!response || !response.ok) {
      const message = response?.statusText || "Unknown error";
      return new Response(
        JSON.stringify({ error: `${provider} API Error: ${message}` }),
        {
          status: response?.status || 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const data = await response.json();
    let text = "";

    switch (normalizedProvider) {
      case "openai":
      case "mistral":
        text = data.choices?.[0]?.message?.content || "";
        break;
      case "claude":
        text = data.content?.[0]?.text || "";
        break;
    }

    return new Response(JSON.stringify({ text }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("AI Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
