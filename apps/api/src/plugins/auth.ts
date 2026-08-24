import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { STAFF_ROLES, type Role } from '@childshield/shared';
import type { Env } from '../env.js';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  displayName: string;
  kind: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  kind: 'refresh';
}

export interface StaffPrincipal {
  id: string;
  role: Role;
  displayName: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    staff: StaffPrincipal | null;
    refreshJwtVerify: FastifyRequest['jwtVerify'];
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireStaff: (roles?: readonly Role[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AccessTokenPayload | RefreshTokenPayload;
    user: AccessTokenPayload | RefreshTokenPayload;
  }
}

export const authPlugin = fp<{ env: Env }>(async (app, opts) => {
  const { env } = opts;

  await app.register(fastifyJwt, {
    secret: env.JWT_ACCESS_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_TTL },
  });

  await app.register(fastifyJwt, {
    secret: env.JWT_REFRESH_SECRET,
    sign: { expiresIn: env.JWT_REFRESH_TTL },
    namespace: 'refresh',
    jwtVerify: 'refreshJwtVerify',
    jwtSign: 'refreshJwtSign',
    jwtDecode: 'refreshJwtDecode',
  });

  app.decorateRequest('staff', null);

  app.decorate('authenticate', async (request: FastifyRequest) => {
    let payload: AccessTokenPayload | RefreshTokenPayload;
    try {
      payload = await request.jwtVerify<AccessTokenPayload | RefreshTokenPayload>();
    } catch {
      throw new UnauthorizedError();
    }
    if (payload.kind !== 'access') throw new UnauthorizedError('Invalid token kind');
    if (!(STAFF_ROLES as readonly string[]).includes(payload.role)) {
      throw new ForbiddenError('Staff role required');
    }
    request.staff = { id: payload.sub, role: payload.role, displayName: payload.displayName };
  });

  app.decorate(
    'requireStaff',
    (roles?: readonly Role[]) =>
      async (request: FastifyRequest, reply: FastifyReply) => {
        await app.authenticate(request, reply);
        if (roles && request.staff && !roles.includes(request.staff.role)) {
          throw new ForbiddenError();
        }
      },
  );
}, { name: 'auth' });
