import type { TaxRule } from './contracts';
import { MAX_MINOR, monetaryError } from '../monetary/domain';

function taxBaseMinor(amount: bigint, rule: Pick<TaxRule, 'base'>): bigint {
  if (amount < 0n || amount > MAX_MINOR) {
    monetaryError('TAX_RANGE', 'Налоговая база вне допустимого диапазона');
  }
  const threshold = rule.base?.kind === 'EXCESS' ? BigInt(rule.base.thresholdMinor) : 0n;
  if (threshold < 0n || threshold > MAX_MINOR) {
    monetaryError('TAX_RANGE', 'Необлагаемый порог вне допустимого диапазона');
  }
  return amount > threshold ? amount - threshold : 0n;
}
export { taxBaseMinor };
