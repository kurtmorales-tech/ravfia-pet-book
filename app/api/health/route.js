import { NextResponse } from 'next/server';
import { paypalStatus } from '../../../lib/paypal';

export async function GET() {
  const paypal = paypalStatus();
  return NextResponse.json(
    {
      ok: true,
      paypal: {
        configured: paypal.configured,
        environment: paypal.environment,
        sandbox: paypal.sandbox,
      },
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
      paymentTokensConfigured: Boolean(
        process.env.PAYMENT_TOKEN_SECRET || process.env.PAYPAL_CLIENT_SECRET
      ),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
