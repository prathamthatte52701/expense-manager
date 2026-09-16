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

async function chatJson(systemPrompt, userContent) {
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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      }),
    });
    if (!response.ok) {
      const error = new Error(`Groq chat failed: ${response.status}`);
      error.status = response.status;
      throw error;
    }
    const data = await response.json();
    return JSON.parse(data.choices?.[0]?.message?.content || '{}');
  });
}

async function extractExpense(transcript) {
  const parsed = await chatJson(
    `Extract an expense from a sentence that may be in Hindi, Hinglish, or English. Return only JSON: { "category": one of ${JSON.stringify(categories)} or null, "amount": number in rupees or null, "confidence": integer 0-100 reflecting how certain you are about both fields }. If either field is ambiguous or missing, return null for it and lower confidence accordingly. Never guess.`,
    transcript
  );
  const category = categories.includes(parsed.category) ? parsed.category : null;
  const amount = Number.isFinite(Number(parsed.amount)) && Number(parsed.amount) > 0 ? Number(parsed.amount) : null;
  let confidence = Number.isFinite(Number(parsed.confidence)) ? Math.round(Number(parsed.confidence)) : 0;
  confidence = Math.max(0, Math.min(100, confidence));
  if (!category || !amount) confidence = Math.min(confidence, 39);
  return { category, amount, confidence };
}

const QUERY_TYPES = ['monthly_summary', 'category_breakdown', 'remaining_budget', 'month_comparison'];

async function classifyVoiceIntent(transcript, currentMonthYear) {
  const parsed = await chatJson(
    `Classify a voice command that may be in Hindi, Hinglish, or English. Current month is ${currentMonthYear} (YYYY-MM). Return only JSON: { "intent": "log_expense" or "query", "queryType": one of ${JSON.stringify(QUERY_TYPES)} or "unsupported" or null, "monthYear": "YYYY-MM" string if the user clearly referenced a specific month/year, else null }. "log_expense" is ONLY for statements reporting a specific amount spent (e.g. "500 rupees on fuel", "spent 200 on food"). Everything else — questions, requests, unrelated statements, small talk — is "query". If it's a query about expenses/budget matching one of the 4 supported types, set queryType to that; otherwise (including anything unrelated to expenses, like the weather) set queryType "unsupported". Never guess a month reference — only set monthYear if explicit or unambiguous (e.g. "last month", "August").`,
    transcript
  );
  const intent = parsed.intent === 'query' ? 'query' : 'log_expense';
  let queryType = null;
  if (intent === 'query') {
    queryType = QUERY_TYPES.includes(parsed.queryType) ? parsed.queryType : 'unsupported';
  }
  const monthYear = /^\d{4}-(0[1-9]|1[0-2])$/.test(parsed.monthYear) ? parsed.monthYear : null;
  return { intent, queryType, monthYear };
}

async function generateNarrativeSummary(queryType, realData) {
  const parsed = await chatJson(
    `You phrase short, natural answers about a user's expenses using ONLY the real numbers given to you as JSON. Amounts are in Indian Rupees — always use the ₹ symbol, never $. Never invent or alter numbers. Respond in 1-3 sentences, friendly and concise. Return only JSON: { "answer": string }.`,
    JSON.stringify({ queryType, data: realData })
  );
  return typeof parsed.answer === 'string' && parsed.answer.trim() ? parsed.answer.trim() : 'Here are your numbers.';
}

module.exports = { transcribeAudio, extractExpense, classifyVoiceIntent, generateNarrativeSummary };
