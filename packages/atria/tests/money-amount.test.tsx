import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoneyAmount, formatMoneyMinor, moneyInputToMinor } from '../src/components/MoneyAmount';

describe('exact monetary presentation', () => {
  it('formats beyond Number precision without losing a minor unit', () => {
    expect(formatMoneyMinor('999999999999999999999999999999', 'en')).toBe(
      '9,999,999,999,999,999,999,999,999,999.99',
    );
    expect(formatMoneyMinor('-1', 'ru')).toBe('−0,01');
    render(<MoneyAmount minor="0" locale="en" code="HCM" />);
    expect(screen.getByText('HCM').parentElement?.textContent).toBe('0.00 HCM');
  });
  it('accepts localized decimals while rejecting exponents, excess precision and negatives', () => {
    expect(moneyInputToMinor('9007199254740993,01')).toBe('900719925474099301');
    expect(moneyInputToMinor('1.2')).toBe('120');
    for (const invalid of ['1.001', '-1', '1e3', '01', '1,000.00', '']) {
      expect(moneyInputToMinor(invalid)).toBeNull();
    }
  });
});
