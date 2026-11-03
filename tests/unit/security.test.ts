import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../workers/services/security';

describe('password security', () => {
  it('hashes and verifies password', async () => {
    const hash = await hashPassword('super-secure-password');
    await expect(verifyPassword('super-secure-password', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });
});
