// Signed, stateless proof that a PayPal order was created by this app for a
// specific service and deposit amount. The browser receives the token with
// the order ID and sends it back on capture. Capture refuses to run without a
// valid token, so an arbitrary PayPal order ID cannot be captured through this
// endpoint.
//
// HMAC-SHA-256 is provided by Web Crypto, which works in both Node and
// Cloudflare Workers. The payload is signed, not encrypted: it only contains
// data the browser already knows (order ID, service, deposit, booking ID).

import { getService } from './services';

const TOKEN_VERSION = 1;
const TOKEN_TTL_SECONDS = 60 * 60;
const encoder = new TextEncoder();

function tokenSecret() {
  const secret = process.env.PAYMENT_TOKEN_SECRET || process.env.PAYPAL_CLIENT_SECRET;
  if (!secret) {
    throw new Error('Payment token secret is not configured.');
  }
  return secret;
}

function base64UrlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmacKey() {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(tokenSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createCaptureToken({ orderId, serviceId, deposit, bookingId }) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    v: TOKEN_VERSION,
    orderId,
    serviceId,
    deposit: Number(deposit).toFixed(2),
    bookingId,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const encoded = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(), encoder.encode(encoded));
  return `${encoded}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyCaptureToken(token, expectedOrderId) {
  if (typeof token !== 'string') return null;

  const [encoded, signature, ...extra] = token.split('.');
  if (!encoded || !signature || extra.length > 0) return null;

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(),
      base64UrlDecode(signature),
      encoder.encode(encoded)
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encoded)));
    const now = Math.floor(Date.now() / 1000);
    if (payload.v !== TOKEN_VERSION) return null;
    if (payload.orderId !== expectedOrderId) return null;
    if (!Number.isInteger(payload.exp) || payload.exp <= now) return null;
    if (!Number.isInteger(payload.iat) || payload.iat > now + 60) return null;
    if (!getService(payload.serviceId)) return null;
    if (!/^\d+\.\d{2}$/.test(String(payload.deposit || ''))) return null;
    if (typeof payload.bookingId !== 'string' || !payload.bookingId) return null;

    return payload;
  } catch {
    return null;
  }
}
