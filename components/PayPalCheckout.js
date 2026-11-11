'use client';

import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useRef } from 'react';

// PayPal SANDBOX checkout for the booking deposit. Buttons come from the
// PayPal JS SDK; order create/capture run through our own API routes so the
// secret key never reaches the browser, and the deposit amount is computed
// on the server from the service picked.
export default function PayPalCheckout({ booking, onPaid, onError }) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const captureToken = useRef(null);

  if (!clientId) {
    return (
      <div className="notice">
        PayPal checkout is not turned on yet. The sandbox client ID
        (NEXT_PUBLIC_PAYPAL_CLIENT_ID) has not been added, so the deposit
        button is off for now. Your booking details above are still saved on
        this screen.
      </div>
    );
  }

  return (
    <PayPalScriptProvider options={{ clientId, currency: 'USD', intent: 'capture' }}>
      <PayPalButtons
        style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' }}
        createOrder={async () => {
          const res = await fetch('/api/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              serviceId: booking.serviceId,
              date: booking.date,
              petName: booking.petName,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Could not create the PayPal order.');
          captureToken.current = data.captureToken;
          return data.id;
        }}
        onApprove={async (data) => {
          if (!captureToken.current) {
            onError('Could not verify this PayPal order. Please try again.');
            return;
          }
          const res = await fetch('/api/paypal/capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: data.orderID, captureToken: captureToken.current }),
          });
          const result = await res.json();
          if (!res.ok) {
            onError(result.error || 'Payment capture failed.');
            return;
          }
          onPaid(result);
        }}
        onError={(err) => onError(err?.message || 'PayPal hit a problem. Try again.')}
      />
    </PayPalScriptProvider>
  );
}
