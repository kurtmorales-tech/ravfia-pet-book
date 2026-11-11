import { describe, expect, it } from 'vitest';
import {
  formatDate,
  parseBookingRequest,
  writeConfirmationSummary,
} from '../lib/assistant';

const NOW = new Date(2026, 10, 10, 12, 0, 0); // Tuesday, Nov 10, 2026

describe('parseBookingRequest', () => {
  it('parses a natural-language sitting request', () => {
    const parsed = parseBookingRequest(
      'I need someone to watch my dog Max next Friday evening',
      NOW
    );

    expect(parsed.fields).toEqual({
      serviceId: 'pet-sitting',
      date: '2026-11-13',
      timeWindow: 'evening',
      petName: 'Max',
      petType: 'Dog',
    });
    expect(parsed.missing).toEqual([]);
    expect(parsed.understood).toContain('service: Pet Sitting');
  });

  it('parses a grooming request with an explicit date', () => {
    const parsed = parseBookingRequest('Book a grooming for Bella on Nov 14 in the morning', NOW);

    expect(parsed.fields).toMatchObject({
      serviceId: 'grooming',
      date: '2026-11-14',
      timeWindow: 'morning',
      petName: 'Bella',
    });
  });

  it('parses relative dates and time-of-day words', () => {
    const parsed = parseBookingRequest('walk my dog tomorrow afternoon', NOW);

    expect(parsed.fields).toMatchObject({
      serviceId: 'dog-walking',
      date: '2026-11-11',
      timeWindow: 'afternoon',
      petType: 'Dog',
    });
  });

  it('maps clock times into a time window', () => {
    expect(parseBookingRequest('grooming at 7 pm', NOW).fields.timeWindow).toBe('evening');
    expect(parseBookingRequest('grooming at noon', NOW).fields.timeWindow).toBe('midday');
    expect(parseBookingRequest('grooming at 8 am', NOW).fields.timeWindow).toBe('morning');
  });

  it('rejects impossible calendar dates instead of rolling them over', () => {
    const parsed = parseBookingRequest('grooming on Feb 31 in the morning', NOW);

    expect(parsed.fields.date).toBeUndefined();
    expect(parsed.missing).toContain('the date');
  });

  it('reports what is missing for a vague request', () => {
    const parsed = parseBookingRequest('hello there', NOW);

    expect(parsed.fields).toEqual({});
    expect(parsed.understood).toEqual([]);
    expect(parsed.missing.length).toBe(3);
  });
});

describe('formatDate', () => {
  it('formats an ISO date without a timezone shift', () => {
    expect(formatDate('2026-11-13')).toBe('Friday, November 13, 2026');
    expect(formatDate('')).toBe('');
  });
});

describe('writeConfirmationSummary', () => {
  const booking = {
    serviceId: 'grooming',
    date: '2026-11-14',
    timeWindow: 'morning',
    petName: 'Bella',
    petType: 'Cat',
    customerName: 'Jordan',
    notes: '',
  };

  it('writes a completed booking summary', () => {
    const summary = writeConfirmationSummary(booking, {
      id: 'ORDER123',
      status: 'COMPLETED',
      amountPaid: '16.50',
    });

    expect(summary).toContain("you're booked");
    expect(summary).toContain('$16.50');
    expect(summary).toContain('ORDER123');
    expect(summary).not.toMatch(/by email/i);
  });

  it('does not call a pending payment a confirmed booking', () => {
    const summary = writeConfirmationSummary(booking, {
      id: 'ORDER123',
      status: 'PENDING',
      amountPaid: '16.50',
    });

    expect(summary).toContain('payment is pending');
    expect(summary).not.toContain("you're booked");
    expect(summary).toContain('not confirmed');
  });
});
