import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import {
  LoginRequestSchema,
  RefreshRequestSchema,
  TokenPairSchema,
  type LoginRequest,
  type RefreshRequest,
  type Role,
} from '@childshield/shared';
import { UnauthorizedError } from '../../lib/errors.js';
import type { AuthService } from './service.js';
import type { AccessTokenPayload, RefreshTokenPayload } from '../../plugins/auth.js';

const ErrorSchema = Type.Object({ code: Type.String(), message: Type.String() });

export function registerAuthRoutes(app: FastifyInstance, authService: AuthService): void {
  // @fastify/jwt namespaced instances are not reflected in its types.
  const refreshJwt = (app.jwt as unknown as Record<'refresh', typeof app.jwt>).refresh;

  app.post<{ Body: LoginRequest }>(
    '/auth/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Staff login (argon2 + TOTP when enrolled). Children never log in.',
        body: LoginRequestSchema,
        response: { 200: TokenPairSchema, 401: ErrorSchema },
      },
    },
    async (request) => {
      const { email, password, totpCode } = request.body;
      const { user } = await authService.verifyCredentials(email, password, totpCode);

      const accessPayload: AccessTokenPayload = {
        sub: user.id,
        role: user.role as Role,
        displayName: user.displayName,
        kind: 'access',
      };
      const refreshPayload: RefreshTokenPayload = { sub: user.id, kind: 'refresh' };

      return {
        accessToken: app.jwt.sign(accessPayload),
        refreshToken: refreshJwt.sign(refreshPayload),
        role: user.role as Role,
        displayName: user.displayName,
      };
    },
  );

  app.post<{ Body: RefreshRequest }>(
    '/auth/refresh',
    {
      schema: {
        tags: ['auth'],
        summary: 'Exchange a refresh token for a new token pair',
        body: RefreshRequestSchema,
        response: { 200: TokenPairSchema, 401: ErrorSchema },
      },
    },
    async (request) => {
      let payload: RefreshTokenPayload;
      try {
        payload = refreshJwt.verify<RefreshTokenPayload>(request.body.refreshToken);
      } catch {
        throw new UnauthorizedError('Invalid refresh token');
      }
      if (payload.kind !== 'refresh') throw new UnauthorizedError('Invalid refresh token');

      const user = await authService.getActiveUser(payload.sub);

      const accessPayload: AccessTokenPayload = {
        sub: user.id,
        role: user.role as Role,
        displayName: user.displayName,
        kind: 'access',
      };
      return {
        accessToken: app.jwt.sign(accessPayload),
        refreshToken: refreshJwt.sign({ sub: user.id, kind: 'refresh' }),
        role: user.role as Role,
        displayName: user.displayName,
      };
    },
  );
}
