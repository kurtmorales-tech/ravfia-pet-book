import { NextResponse } from 'next/server';
import { capturePaypalOrder } from '../../../../lib/paypal';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  const orderId = body?.orderId;
  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required.' }, { status: 400 });
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
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
