import argon2 from 'argon2';
import { authenticator } from 'otplib';
import type { PrismaClient, User } from '@childshield/db';
import { STAFF_ROLES } from '@childshield/shared';
import { UnauthorizedError } from '../../lib/errors.js';

export interface AuthResult {
  user: User;
}

export class AuthService {
  constructor(private readonly prisma: PrismaClient) {}

  async verifyCredentials(email: string, password: string, totpCode?: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Uniform error for unknown email / bad password / bad TOTP — no
    // account-existence oracle.
    if (!user || !user.active) throw new UnauthorizedError('Invalid credentials');

    const passwordOk = await argon2.verify(user.passwordHash, password).catch(() => false);
    if (!passwordOk) throw new UnauthorizedError('Invalid credentials');

    if (!(STAFF_ROLES as readonly string[]).includes(user.role)) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // MFA hook: enforced whenever the account has a TOTP secret enrolled.
    if (user.totpSecret) {
      if (!totpCode || !authenticator.verify({ token: totpCode, secret: user.totpSecret })) {
        throw new UnauthorizedError('Invalid credentials');
      }
    }

    return { user };
  }

  async getActiveUser(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || !user.active) throw new UnauthorizedError('Invalid credentials');
    return user;
  }
}
