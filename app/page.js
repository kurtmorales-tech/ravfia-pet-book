'use client';

import { useEffect, useRef, useState } from 'react';
import ServicesList from '../components/ServicesList';
import ScheduleAssistant from '../components/ScheduleAssistant';
import BookingForm from '../components/BookingForm';
import PayPalCheckout from '../components/PayPalCheckout';
import Confirmation from '../components/Confirmation';
import { getService, depositFor, money, todayISO } from '../lib/services';

const EMPTY_BOOKING = {
  serviceId: '',
  date: '',
  timeWindow: '',
  petName: '',
  petType: '',
  customerName: '',
  email: '',
  notes: '',
};

export default function Home() {
  const [booking, setBooking] = useState(EMPTY_BOOKING);
  const [step, setStep] = useState('book'); // book -> pay -> done
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');
  const [today, setToday] = useState('');
  const errorRef = useRef(null);
  const payHeadingRef = useRef(null);

  const service = getService(booking.serviceId);
  const deposit = depositFor(service);

  useEffect(() => {
    setToday(todayISO());
  }, []);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  useEffect(() => {
    if (step === 'pay') payHeadingRef.current?.focus();
  }, [step]);

  function fillFromAssistant(fields) {
    setBooking((b) => ({ ...b, ...fields }));
  }

  function readyToPay() {
    return (
      booking.serviceId &&
      booking.date &&
      booking.date >= todayISO() &&
      booking.timeWindow &&
      booking.customerName.trim() &&
      /.+@.+\..+/.test(booking.email)
    );
  }

  function goToPay(e) {
    e.preventDefault();
    if (booking.date && booking.date < todayISO()) {
      setError('Pick a date in the future.');
      return;
    }
    if (!readyToPay()) {
      setError('Fill in the service, date, time window, your name, and a valid email first.');
      return;
    }
    setError('');
    setStep('pay');
    window.scrollTo({ top: 0 });
  }

  function startOver() {
    setBooking(EMPTY_BOOKING);
    setPayment(null);
    setError('');
    setStep('book');
    window.scrollTo({ top: 0 });
  }

  return (
    <main>
      <header className="brand">
        <h1>
          RavFia <span>Pet Services</span>
        </h1>
        <p>Book pet care in plain English. A small deposit locks in your spot — no more no-shows.</p>
      </header>

      {error && (
        <div className="error" id="form-error" role="alert" tabIndex={-1} ref={errorRef}>
          {error}
        </div>
      )}

      {step === 'done' && payment ? (
        <section className="panel">
          <Confirmation booking={booking} payment={payment} onStartOver={startOver} />
        </section>
      ) : (
        <>
          <section className="panel">
            <h2>1. Ask the scheduling assistant</h2>
            <ScheduleAssistant onFill={fillFromAssistant} />
          </section>

          <section className="panel">
            <h2>2. Pick a service</h2>
            <ServicesList
              selectedId={booking.serviceId}
              onSelect={(id) => setBooking((b) => ({ ...b, serviceId: id }))}
            />
            <p className="fineprint">Prices are demo data for this prototype.</p>
          </section>

          <section className="panel">
            <h2>3. Booking details</h2>
            <p className="fineprint">Fields marked * are required.</p>
            <form onSubmit={goToPay}>
              <BookingForm booking={booking} onChange={setBooking} minDate={today || undefined} />
              {step === 'book' && (
                <div className="actions">
                  <button className="primary" type="submit" disabled={!service}>
                    {service
                      ? `Review & pay ${money(deposit)} deposit`
                      : 'Pick a service to continue'}
                  </button>
                  {service && (
                    <span className="hint">
                      {service.name} is {money(service.price)} {service.unit}. The deposit is 30% —{' '}
                      {money(deposit)} — paid through PayPal. The rest is due at the appointment.
                    </span>
                  )}
                </div>
              )}
            </form>
          </section>

          {step === 'pay' && service && (
            <section className="panel">
              <h2 tabIndex={-1} ref={payHeadingRef}>
                4. Pay the deposit
              </h2>
              <div className="deposit-box">
                Deposit due today: <strong>{money(deposit)}</strong>
                <br />
                {service.name} on {booking.date} ({booking.timeWindow}) for{' '}
                {booking.petName || 'your pet'}.
              </div>
              <PayPalCheckout
                booking={booking}
                onPaid={(result) => {
                  setPayment(result);
                  setError('');
                  setStep('done');
                  window.scrollTo({ top: 0 });
                }}
                onError={(msg) => setError(msg)}
              />
              <button className="ghost" type="button" onClick={() => setStep('book')}>
                Back to booking details
              </button>
            </section>
          )}
        </>
      )}

      <footer className="footer">
        <p>
          Hackathon prototype built for the Devpost PayPal AI Hackathon. Payments run on the
          PayPal <strong>sandbox</strong> — no real money moves. Service prices shown are demo
          data, not the pricing of a real operating business.
        </p>
      </footer>
    </main>
  );
}
