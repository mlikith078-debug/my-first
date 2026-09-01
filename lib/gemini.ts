const MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];

function getKey() {
  const raw = process.env.GEMINI_API_KEY;
  const value = raw?.trim().replace(/^['"]|['"]$/g, '');
  if (!value || value === 'your_gemini_api_key' || value === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in Vercel. Add it to the deployed environment and redeploy.');
  }
  return value;
}

function errorMessage(data: any, status: number) {
  return data?.error?.message || data?.message || 'HTTP ' + status;
}

export async function askGemini(prompt: string, json = false) {
  const key = getKey();
  let lastError: Error | null = null;

  for (const model of MODELS) {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(key),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            ...(json ? { responseMimeType: 'application/json' } : {}),
          },
        }),
      },
    );

    const rawBody = await response.text();
    let data: any = null;
    try {
      data = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      data = null;
    }

    if (response.ok) {
      const text = data?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part.text || '')
        .join('')
        .trim();
      if (text) return text;
      lastError = new Error('Gemini returned an empty response.');
      continue;
    }

    const detail = errorMessage(data, response.status);
    if (response.status === 401 || response.status === 403) {
      throw new Error('Gemini rejected GEMINI_API_KEY. Verify the key, its API access, and the Vercel environment, then redeploy.');
    }

    lastError = new Error(
      'Gemini model ' + model + ' failed (HTTP ' + response.status + '): ' + detail,
    );
    // A model can be unavailable or retired while another supported model works.
    // Try the next model for those and for temporary quota/service errors.
  }

  throw lastError || new Error('Gemini is temporarily unavailable.');
}

export function parseJson<T>(value: string) {
  const fence = String.fromCharCode(96).repeat(3);
  const cleaned = value
    .replace(new RegExp('^\\s*' + fence + '(?:json)?\\s*', 'i'), '')
    .replace(new RegExp('\\s*' + fence + '\\s*$', 'i'), '')
    .trim();
  return JSON.parse(cleaned) as T;
}
