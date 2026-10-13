// oxlint-disable node/no-sync -- The small local operator policy is read atomically at each authorization boundary so edits take effect immediately.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { Role } from './policy';

const MAX_OPERATORS = 1000;
const OperatorsSchema = z
  .array(z.strictObject({ name: z.string().regex(/^[A-Za-z0-9_]{3,16}$/u) }))
  .max(MAX_OPERATORS);
function operatorNames(): string[] {
  const configured = process.env.OPS_FILE;
  const filePath =
    configured ??
    [path.resolve('ops.json'), path.resolve('../../ops.json')].find((candidate) =>
      existsSync(candidate),
    );
  if (filePath === undefined) {
    return [];
  }
  const content: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
  return OperatorsSchema.parse(content).map((entry) => entry.name.toLowerCase());
}
function isOperatorName(name: string): boolean {
  return operatorNames().includes(name.toLowerCase());
}
function effectiveRoles(name: string, roles: readonly Role[]): Role[] {
  return [...new Set(isOperatorName(name) ? [...roles, 'ADMIN' as const] : roles)];
}
export { operatorNames, isOperatorName, effectiveRoles };
