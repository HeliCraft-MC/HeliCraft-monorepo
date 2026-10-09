const ARGON_MEMORY_KIB = 65_536;
const ARGON_ITERATIONS = 3;
async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: 'argon2id',
    memoryCost: ARGON_MEMORY_KIB,
    timeCost: ARGON_ITERATIONS,
  });
}
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}

export { hashPassword, verifyPassword };
