// Small, dependency-free controls for public API routes.
//
// The rate limiter is in-memory and therefore per Worker isolate. It is a
// speed bump for accidental loops and casual abuse, not a global quota. Use a
// Cloudflare Rate Limiting rule or a Durable Object if stricter limits are
// needed.

const WINDOW_MS = 60_000;
const MAX_BUCKETS = 10_000;
const buckets = new Map();

export function clientKey(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip =
    request.headers.get('cf-connecting-ip') ||
    (forwarded ? forwarded.split(',').at(-1).trim() : '') ||
    'unknown';
  return ip.slice(0, 128);
}

export function rateLimit(request, route, limit, windowMs = WINDOW_MS) {
  const key = `${route}:${clientKey(request)}`;
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    if (buckets.size >= MAX_BUCKETS && !buckets.has(key)) {
      buckets.delete(buckets.keys().next().value);
    }
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  if (bucket.count >= limit) {
    return {
      limited: true,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { limited: false, remaining: limit - bucket.count };
}

export async function readJsonBody(request, maximumBytes) {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    return { error: 'too_large' };
  }

  let text;
  try {
    text = await request.text();
  } catch {
    return { error: 'invalid_json' };
  }

  if (new TextEncoder().encode(text).byteLength > maximumBytes) {
    return { error: 'too_large' };
  }

  try {
    return { body: JSON.parse(text) };
  } catch {
    return { error: 'invalid_json' };
  }
}

export function isSameOriginRequest(request) {
  const origin = request.headers.get('origin');
  // Browsers send Origin for cross-origin POSTs. Requests without an Origin
  // header (curl, server-to-server) are allowed; the signed payment token is
  // the real authorization boundary for PayPal routes.
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function tooManyRequestsResponse(NextResponse, retryAfter) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}
