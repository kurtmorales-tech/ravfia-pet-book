import { NextResponse } from 'next/server';
import {
  capturePaypalOrder,
  isSameOriginRequest,
  verifyCaptureToken,
} from '../../../../lib/paypal';

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Request must come from this site.' }, { status: 403 });
  }

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
  if (!verifyCaptureToken(orderId, body?.captureToken)) {
    return NextResponse.json({ error: 'Invalid or expired capture authorization.' }, { status: 403 });
  }

  try {
    const capture = await capturePaypalOrder(orderId);
    const unit = capture.purchase_units?.[0];
    const cap = unit?.payments?.captures?.[0];
    return NextResponse.json({
      id: capture.id,
      status: capture.status,
      amountPaid: cap?.amount?.value || null,
      currency: cap?.amount?.currency_code || 'USD',
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
