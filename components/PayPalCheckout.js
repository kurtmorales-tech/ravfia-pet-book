'use client';

import { useRef } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { todayISO } from '../lib/services';

// PayPal SANDBOX checkout for the booking deposit. Buttons come from the
// PayPal JS SDK; order create/capture run through our own API routes so the
// secret key never reaches the browser, and the deposit amount is computed
// on the server from the service picked.
export default function PayPalCheckout({ booking, onPaid, onError }) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  // Keyed by order ID: PayPal can call createOrder again if the customer
  // closes the popup and retries, and each order has its own signed token.
  const captureTokens = useRef(new Map());

  if (!clientId) {
    return (
      <div className="notice" role="status">
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
          try {
            const res = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                serviceId: booking.serviceId,
                date: booking.date,
                timeWindow: booking.timeWindow,
                petName: booking.petName,
                today: todayISO(),
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not create the PayPal order.');
            if (!data.id || !data.captureToken) {
              throw new Error('PayPal did not return a usable order.');
            }
            captureTokens.current.set(data.id, data.captureToken);
            return data.id;
          } catch (error) {
            onError(error.message || 'Could not start PayPal checkout.');
            throw error;
          }
        }}
        onApprove={async (data) => {
          const captureToken = captureTokens.current.get(data.orderID);
          if (!captureToken) {
            onError('Could not verify this PayPal order. Please start checkout again.');
            return;
          }
          try {
            const res = await fetch('/api/paypal/capture-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: data.orderID, captureToken }),
            });
            const result = await res.json();
            if (!res.ok) {
              onError(result.error || 'Payment capture failed.');
              return;
            }
            captureTokens.current.delete(data.orderID);
            onPaid(result);
          } catch {
            onError('Could not reach the payment server. Please try again.');
          }
        }}
        onError={(err) => onError(err?.message || 'PayPal hit a problem. Try again.')}
      />
    </PayPalScriptProvider>
  );
}
