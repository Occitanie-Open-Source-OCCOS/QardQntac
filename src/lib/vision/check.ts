import { env } from "@/env";

async function checkOllama(baseUrl: string, model: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/tags`);
  } catch {
    throw new Error(
      `Ollama unreachable at ${baseUrl} — is the daemon running?`,
    );
  }
  if (!res.ok) {
    throw new Error(`Ollama returned ${res.status} on /api/tags`);
  }
  const json = await res.json();
  const names: string[] = (json.models ?? []).map(
    (m: { name: string }) => m.name,
  );
  const found = names.some((n) => n === model || n.startsWith(`${model}:`));
  if (!found) {
    throw new Error(
      `Ollama model "${model}" not found. Run: ollama pull ${model}\n` +
        `Available models: ${names.join(", ") || "(none)"}`,
    );
  }
  console.log(`Ollama model "${model}" OK`);
}

async function checkOpenAI(apiKey: string, model: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`https://api.openai.com/v1/models/${model}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch {
    throw new Error(`OpenAI unreachable — check your connection`);
  }
  if (res.status === 401) throw new Error(`OPENAI_API_KEY invalid`);
  if (res.status === 404)
    throw new Error(`OpenAI model "${model}" not found or not accessible`);
  if (!res.ok) throw new Error(`OpenAI model check failed: ${res.status}`);
  console.log(`OpenAI model "${model}" OK`);
}

async function checkAnthropic(apiKey: string, model: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`https://api.anthropic.com/v1/models/${model}`, {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
  } catch {
    throw new Error(`Anthropic unreachable — check your connection`);
  }
  if (res.status === 401) throw new Error(`ANTHROPIC_API_KEY invalid`);
  if (res.status === 404)
    throw new Error(`Anthropic model "${model}" not found`);
  if (!res.ok) throw new Error(`Anthropic model check failed: ${res.status}`);
  console.log(`Anthropic model "${model}" OK`);
}

async function checkGemini(apiKey: string, model: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${apiKey}`,
    );
  } catch {
    throw new Error(`Gemini unreachable — check your connection`);
  }
  if (res.status === 401 || res.status === 403)
    throw new Error(`GEMINI_API_KEY invalid`);
  if (res.status === 404) throw new Error(`Gemini model "${model}" not found`);
  if (!res.ok) throw new Error(`Gemini model check failed: ${res.status}`);
  console.log(`Gemini model "${model}" OK`);
}

async function checkCustom(
  baseUrl: string,
  model: string,
  apiKey?: string,
): Promise<void> {
  const headers: Record<string, string> = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/models`, { headers });
  } catch {
    throw new Error(
      `Custom provider unreachable at ${baseUrl} — check your connection`,
    );
  }
  if (res.status === 401) throw new Error(`CUSTOM_API_KEY invalid`);
  if (!res.ok) {
    console.warn(
      `Custom provider /models returned ${res.status} — skipping model check`,
    );
    return;
  }
  try {
    const json = await res.json();
    const names: string[] = (json.data ?? []).map((m: { id: string }) => m.id);
    if (names.length > 0 && !names.includes(model)) {
      throw new Error(
        `Custom model "${model}" not found. Available: ${names.join(", ")}`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("not found")) throw e;
    console.warn(
      `Custom provider /models response unreadable — skipping model check`,
    );
  }
  console.log(`Custom provider "${baseUrl}" OK`);
}

export async function checkVisionProvider(): Promise<void> {
  const provider = env.VISION_PROVIDER;
  console.log(`Checking provider "${provider}"...`);

  switch (provider) {
    case "ollama":
      await checkOllama(env.OLLAMA_BASE_URL, env.OLLAMA_MODEL);
      break;
    case "openai":
      if (!env.OPENAI_API_KEY)
        throw new Error(`OPENAI_API_KEY not set but VISION_PROVIDER=openai`);
      await checkOpenAI(env.OPENAI_API_KEY, env.OPENAI_MODEL);
      break;
    case "anthropic":
      if (!env.ANTHROPIC_API_KEY)
        throw new Error(
          `ANTHROPIC_API_KEY not set but VISION_PROVIDER=anthropic`,
        );
      await checkAnthropic(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL);
      break;
    case "gemini":
      if (!env.GEMINI_API_KEY)
        throw new Error(`GEMINI_API_KEY not set but VISION_PROVIDER=gemini`);
      await checkGemini(env.GEMINI_API_KEY, env.GEMINI_MODEL);
      break;
    case "custom":
      if (!env.CUSTOM_BASE_URL)
        throw new Error(`CUSTOM_BASE_URL not set but VISION_PROVIDER=custom`);
      if (!env.CUSTOM_MODEL)
        throw new Error(`CUSTOM_MODEL not set but VISION_PROVIDER=custom`);
      await checkCustom(
        env.CUSTOM_BASE_URL,
        env.CUSTOM_MODEL,
        env.CUSTOM_API_KEY,
      );
      break;
  }
}
