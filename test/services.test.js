import { describe, expect, it } from 'vitest';
import {
  depositFor,
  getService,
  isPastDate,
  isValidISODate,
  money,
  todayISO,
} from '../lib/services';

const NOW = new Date(2026, 10, 10, 12, 0, 0);

describe('service catalog', () => {
  it('computes the 30% deposit from the server catalog', () => {
    expect(depositFor(getService('dog-walking'))).toBe(7.5);
    expect(depositFor(getService('pet-sitting'))).toBe(18);
    expect(depositFor(getService('grooming'))).toBe(16.5);
    expect(depositFor(getService('boarding'))).toBe(13.5);
    expect(depositFor(getService('drop-in'))).toBe(6);
    expect(depositFor(null)).toBe(0);
  });

  it('formats money safely', () => {
    expect(money(7.5)).toBe('$7.50');
    expect(money('16.50')).toBe('$16.50');
    expect(money(undefined)).toBe('$0.00');
  });
});

describe('date helpers', () => {
  it('accepts real calendar dates only', () => {
    expect(isValidISODate('2026-11-10')).toBe(true);
    expect(isValidISODate('2028-02-29')).toBe(true);
    expect(isValidISODate('2026-02-29')).toBe(false);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('11/10/2026')).toBe(false);
    expect(isValidISODate('')).toBe(false);
  });

  it('compares against the local calendar date', () => {
    expect(todayISO(NOW)).toBe('2026-11-10');
    expect(isPastDate('2026-11-09', NOW)).toBe(true);
    expect(isPastDate('2026-11-10', NOW)).toBe(false);
    expect(isPastDate('2026-11-11', NOW)).toBe(false);
  });
});
