import { NextResponse } from 'next/server';
import {
  capturePaypalOrder,
  isValidPaypalOrderId,
  paypalStatus,
} from '../../../../lib/paypal';
import { verifyCaptureToken } from '../../../../lib/payment-token';
import {
  isSameOriginRequest,
  rateLimit,
  readJsonBody,
  tooManyRequestsResponse,
} from '../../../../lib/request-controls';

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Request must come from this site.' }, { status: 403 });
  }

  const limited = rateLimit(request, 'paypal-capture-order', 10);
  if (limited.limited) return tooManyRequestsResponse(NextResponse, limited.retryAfter);

  const result = await readJsonBody(request, 2048);
  if (result.error === 'too_large') {
    return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
  }
  if (result.error) {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  const orderId = result.body?.orderId;
  if (!isValidPaypalOrderId(orderId)) {
    return NextResponse.json({ error: 'A valid orderId is required.' }, { status: 400 });
  }

  const token = await verifyCaptureToken(result.body?.captureToken, orderId);
  if (!token) {
    return NextResponse.json(
      { error: 'Invalid or expired capture authorization. Please start checkout again.' },
      { status: 403 }
    );
  }

  const paypal = paypalStatus();
  if (!paypal.sandbox) {
    return NextResponse.json(
      { error: 'This app only supports the PayPal sandbox.' },
      { status: 503 }
    );
  }
  if (!paypal.configured) {
    return NextResponse.json(
      { error: 'PayPal sandbox checkout is not configured on this deployment.' },
      { status: 503 }
    );
  }

  try {
    const capture = await capturePaypalOrder(orderId);
    const unit = capture.purchase_units?.[0];
    const payment = unit?.payments?.captures?.[0];
    const amountPaid = payment?.amount?.value || null;
    const currency = payment?.amount?.currency_code || null;

    if (currency !== 'USD' || Number(amountPaid) !== Number(token.deposit)) {
      console.error('PayPal capture amount mismatch:', {
        orderId,
        expected: token.deposit,
        actual: amountPaid,
        currency,
      });
      return NextResponse.json(
        { error: 'The captured amount did not match the booking deposit.' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      id: capture.id,
      bookingId: token.bookingId,
      serviceId: token.serviceId,
      deposit: Number(token.deposit),
      status: capture.status,
      confirmed: capture.status === 'COMPLETED',
      amountPaid,
      currency,
    });
  } catch (error) {
    console.error('PayPal capture failed:', error.message);
    return NextResponse.json(
      { error: 'Could not complete PayPal checkout. Please try again.' },
      { status: 502 }
    );
  }
}
