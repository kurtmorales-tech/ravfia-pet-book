// Server-side PayPal Orders API v2 client (SANDBOX ONLY).
// Adapted from the ravfia-pay scaffold.
//
// Credentials come from env vars — never hard-code keys here. If the keys
// are not set, calls fail with a clear error so the app still builds and
// runs; only checkout is unavailable until sandbox keys are added to
// .env.local. This project intentionally refuses to talk to the live
// PayPal API.

const BASE = 'https://api-m.sandbox.paypal.com';

export function paypalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function assertSandbox() {
  const env = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase();
  if (env !== 'sandbox') {
    throw new Error(
      `PAYPAL_ENV is "${env}" — this hackathon app is sandbox-only. Set PAYPAL_ENV=sandbox.`
    );
  }
}

async function accessToken() {
  assertSandbox();
  if (!paypalConfigured()) {
    throw new Error(
      'PayPal sandbox keys are not set. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env.local.'
    );
  }
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal token request failed: ${data.error_description || res.status}`);
  }
  return data.access_token;
}

export async function createPaypalOrder(amount, description) {
  const token = await accessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          description: description || 'RavFia Pet Services — booking deposit',
          amount: { currency_code: 'USD', value: Number(amount).toFixed(2) },
        },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal create order failed: ${data.message || res.status}`);
  }
  return data;
}

export async function capturePaypalOrder(orderId) {
  const token = await accessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal capture failed: ${data.message || res.status}`);
  }
  return data;
}
