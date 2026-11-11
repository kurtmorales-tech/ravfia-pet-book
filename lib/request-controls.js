const WINDOW_MS = 60_000;
const MAX_RATE_LIMIT_ENTRIES = 10_000;
const rateLimits = new Map();

export async function readJsonBody(request, maximumBytes) {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    return { error: 'too_large' };
  }

  const reader = request.body?.getReader();
  if (!reader) return { error: 'invalid_json' };

  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel().catch(() => {});
        return { error: 'too_large' };
      }
      chunks.push(value);
    }
  } catch {
    return { error: 'invalid_json' };
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { body: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { error: 'invalid_json' };
  }
}

export function isRateLimited(request, route, maximumRequests) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientIp =
    request.headers.get('x-real-ip') ||
    forwardedFor?.split(',').at(-1).trim() ||
    'unknown';
  const key = `${route}:${clientIp.slice(0, 128)}`;
  const now = Date.now();
  let rateLimit = rateLimits.get(key);

  if (!rateLimit || now >= rateLimit.resetAt) {
    if (!rateLimit && rateLimits.size >= MAX_RATE_LIMIT_ENTRIES) {
      rateLimits.delete(rateLimits.keys().next().value);
    }
    rateLimit = { count: 0, resetAt: now + WINDOW_MS };
    rateLimits.set(key, rateLimit);
  }

  if (rateLimit.count >= maximumRequests) return true;
  rateLimit.count += 1;
  return false;
}
