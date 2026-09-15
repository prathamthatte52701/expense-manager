const { groqApiKeys, groqModel, groqWhisperModel, categories } = require('../config');

let keyIndex = 0;

async function withKeyRotation(fn) {
  if (!groqApiKeys.length) throw new Error('No GROQ_API_KEY configured.');
  // Claim this call's own starting index with a single synchronous read+increment
  // (safe — no await between them), then walk a fixed window from there. This
  // keeps one call's retry sequence self-consistent even if concurrent calls
  // advance the shared counter in between this call's own attempts — otherwise
  // a call could get desynced into retrying an already-failed key while never
  // reaching an untried one within its own attempt budget.
  const startIndex = keyIndex;
  keyIndex += groqApiKeys.length;
  let lastError;
  for (let attempt = 0; attempt < groqApiKeys.length; attempt += 1) {
    const key = groqApiKeys[(startIndex + attempt) % groqApiKeys.length];
    try {
      return await fn(key);
    } catch (error) {
      lastError = error;
      if (!(error.status === 429 || error.status === 401)) throw error;
    }
  }
  throw lastError;
}

async function transcribeAudio(buffer, filename, mimeType) {
  return withKeyRotation(async (key) => {
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mimeType || 'audio/webm' }), filename || 'audio.webm');
    form.append('model', groqWhisperModel);
    form.append('response_format', 'json');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!response.ok) {
      const error = new Error(`Groq transcription failed: ${response.status}`);
      error.status = response.status;
      throw error;
    }
    const data = await response.json();
    return data.text || '';
  });
}

async function extractExpense(transcript) {
  return withKeyRotation(async (key) => {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: groqModel,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Extract an expense from a sentence that may be in Hindi, Hinglish, or English. Return only JSON: { "category": one of ${JSON.stringify(categories)} or null, "amount": number in rupees or null }. If either field is ambiguous or missing, return null for it. Never guess.`,
          },
          { role: 'user', content: transcript },
        ],
      }),
    });
    if (!response.ok) {
      const error = new Error(`Groq extraction failed: ${response.status}`);
      error.status = response.status;
      throw error;
    }
    const data = await response.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    const category = categories.includes(parsed.category) ? parsed.category : null;
    const amount = Number.isFinite(Number(parsed.amount)) && Number(parsed.amount) > 0 ? Number(parsed.amount) : null;
    return { category, amount };
  });
}

module.exports = { transcribeAudio, extractExpense };
