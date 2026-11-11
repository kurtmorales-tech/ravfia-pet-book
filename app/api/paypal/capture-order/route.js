import { NextResponse } from 'next/server';
import { capturePaypalOrder, isValidPaypalOrderId } from '../../../../lib/paypal';
import { isRateLimited, readJsonBody } from '../../../../lib/request-controls';

export async function POST(request) {
  if (isRateLimited(request, 'paypal-capture-order', 10)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const result = await readJsonBody(request, 256);
  if (result.error === 'too_large') {
    return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
  }
  if (result.error) {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  const body = result.body;
  const orderId = body?.orderId;
  if (!isValidPaypalOrderId(orderId)) {
    return NextResponse.json({ error: 'A valid orderId is required.' }, { status: 400 });
  }

  try {
    const capture = await capturePaypalOrder(orderId);
    const unit = capture.purchase_units?.[0];
    const cap = unit?.payments?.captures?.[0];
    return NextResponse.json({
      id: capture.id,
      status: capture.status,
      payerEmail: capture.payer?.email_address || null,
      amountPaid: cap?.amount?.value || null,
      currency: cap?.amount?.currency_code || 'USD',
    });
  } catch {
    return NextResponse.json({ error: 'Payment provider is temporarily unavailable.' }, { status: 500 });
  }
}
