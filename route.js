import { NextResponse } from 'next/server';
import { parseBookingRequest, assistantReply } from '../../../lib/assistant';
import { SERVICES, TIME_WINDOWS } from '../../../lib/services';

// Scheduling assistant endpoint.
// If OPENAI_API_KEY is set, an LLM (OpenAI-compatible chat API) tries the
// parse first; ANY failure falls back to the built-in deterministic parser,
// so the app works end to end with no AI key configured.

async function tryLLM(message) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const today = new Date().toISOString().slice(0, 10);
  const serviceList = SERVICES.map((s) => `${s.id} = ${s.name}`).join(', ');
  const windowList = TIME_WINDOWS.map((w) => w.id).join(', ');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              `You parse pet-care booking requests into JSON. Today is ${today}. ` +
              `Services: ${serviceList}. Time windows: ${windowList}. ` +
              'Return ONLY a JSON object with keys: serviceId, date (YYYY-MM-DD), ' +
              'timeWindow, petName, petType. Use null for anything not stated. ' +
              'Resolve relative dates like "next Friday" against today.',
          },
          { role: 'user', content: message },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');

    // Validate against the known catalogs before trusting the output.
    const fields = {};
    if (SERVICES.some((s) => s.id === parsed.serviceId)) fields.serviceId = parsed.serviceId;
    if (/^\d{4}-\d{2}-\d{2}$/.test(parsed.date || '')) fields.date = parsed.date;
    if (TIME_WINDOWS.some((w) => w.id === parsed.timeWindow)) fields.timeWindow = parsed.timeWindow;
    if (typeof parsed.petName === 'string' && parsed.petName) fields.petName = parsed.petName;
    if (typeof parsed.petType === 'string' && parsed.petType) fields.petType = parsed.petType;
    return Object.keys(fields).length > 0 ? fields : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  const message = String(body?.message || '').trim();
  if (!message) {
    return NextResponse.json({ error: 'Tell me what you need — for example, “watch my dog next Friday evening.”' }, { status: 400 });
  }

  const llmFields = await tryLLM(message);
  if (llmFields) {
    // Fill any gaps (and the understood/missing wording) from the parser.
    const fallback = parseBookingRequest(message);
    const merged = { ...fallback, fields: { ...fallback.fields, ...llmFields } };
    return NextResponse.json({
      fields: merged.fields,
      reply: assistantReply({ ...merged, understood: describeFields(merged.fields), missing: missingFor(merged.fields) }),
      source: 'llm',
    });
  }

  const parsed = parseBookingRequest(message);
  return NextResponse.json({
    fields: parsed.fields,
    reply: assistantReply(parsed),
    source: 'parser',
  });
}

function describeFields(fields) {
  // Reuse the parser's phrasing by re-deriving understood items is overkill;
  // build a light version here for the LLM path.
  const out = [];
  if (fields.serviceId) out.push('the service');
  if (fields.date) out.push('the date');
  if (fields.timeWindow) out.push('the time window');
  if (fields.petName || fields.petType) out.push('your pet');
  return out;
}

function missingFor(fields) {
  const missing = [];
  if (!fields.serviceId) missing.push('which service you need');
  if (!fields.date) missing.push('the date');
  if (!fields.timeWindow) missing.push('a time of day');
  return missing;
}
