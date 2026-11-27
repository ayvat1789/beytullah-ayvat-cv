const fs = require('fs');
const path = require('path');
const express = require('express');
const { CV_PROFILE, buildSystemPrompt } = require('./cv-data');

// Load local api-keys.txt / .env if present (never overrides Render environment variables)
function loadLocalKeyFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (key && value && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadLocalKeyFile(path.join(__dirname, '.env'));
loadLocalKeyFile(path.join(__dirname, 'api-keys.txt'));

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SYSTEM_PROMPT = buildSystemPrompt();

app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory rate limiter (30 requests / 10 minutes per IP)
const rateMap = new Map();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 30;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_WINDOW_MS;
  }
  entry.count += 1;
  rateMap.set(ip, entry);
  return entry.count <= RATE_MAX_REQUESTS;
}

async function callOpenRouter(messages) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const candidateModels = [
    process.env.OPENROUTER_MODEL,
    'openrouter/free',
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'mistralai/mistral-small-3.1-24b-instruct:free'
  ].filter(Boolean);

  let lastError = null;

  for (const model of candidateModels) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000',
          'X-Title': 'Beytullah Ayvat CV Assistant'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
          temperature: 0.6,
          max_tokens: 450
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        lastError = new Error(`OpenRouter (${model}) HTTP ${response.status}: ${errText.slice(0, 200)}`);
        continue;
      }

      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content?.trim();
      if (reply) {
        return { reply, provider: 'openrouter', model: data.model || model };
      }
      lastError = new Error(`OpenRouter (${model}) returned empty reply`);
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
    }
  }

  throw lastError || new Error('OpenRouter request failed');
}

async function callGemini(messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 450
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Gemini HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join('')
      .trim();

    if (!reply) {
      throw new Error('Gemini returned empty reply');
    }

    return { reply, provider: 'gemini', model };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    providers: {
      openrouter: Boolean(process.env.OPENROUTER_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY)
    }
  });
});

app.get('/api/cv', (_req, res) => {
  res.json(CV_PROFILE);
});

app.post('/api/chat', async (req, res) => {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'Too many messages in a short time. Please wait a few minutes and try again.'
    });
  }

  const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const sanitized = rawMessages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, 1000)
    }))
    .filter((m) => m.content.length > 0)
    .slice(-10);

  if (sanitized.length === 0 || sanitized[sanitized.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Please send a valid message.' });
  }

  const errors = [];

  if (process.env.OPENROUTER_API_KEY) {
    try {
      const result = await callOpenRouter(sanitized);
      return res.json(result);
    } catch (err) {
      errors.push(err.message);
      console.error('OpenRouter error:', err.message);
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const result = await callGemini(sanitized);
      return res.json(result);
    } catch (err) {
      errors.push(err.message);
      console.error('Gemini error:', err.message);
    }
  }

  return res.status(502).json({
    error: 'The AI assistant is temporarily unavailable. Please try again in a moment.',
    details: process.env.NODE_ENV === 'development' ? errors : undefined
  });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Beytullah Ayvat CV server running on http://localhost:${PORT}`);
});
