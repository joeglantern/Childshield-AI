import { Type, type Static } from '@sinclair/typebox';
import { RoleSchema } from './enums.js';

export const LoginRequestSchema = Type.Object(
  {
    email: Type.String({ format: 'email', maxLength: 254 }),
    password: Type.String({ minLength: 8, maxLength: 256 }),
    /// Required whenever the account has TOTP enrolled (all staff should).
    totpCode: Type.Optional(Type.String({ minLength: 6, maxLength: 8 })),
  },
  { additionalProperties: false },
);

export const TokenPairSchema = Type.Object(
  {
    accessToken: Type.String(),
    refreshToken: Type.String(),
    role: RoleSchema,
    displayName: Type.String(),
  },
  { },
);

export const RefreshRequestSchema = Type.Object(
  { refreshToken: Type.String() },
  { additionalProperties: false },
);

export const WsTicketResponseSchema = Type.Object(
  {
    ticket: Type.String(),
    expiresInSeconds: Type.Number(),
  },
  { },
);

export type LoginRequest = Static<typeof LoginRequestSchema>;
export type TokenPair = Static<typeof TokenPairSchema>;
export type RefreshRequest = Static<typeof RefreshRequestSchema>;
export type WsTicketResponse = Static<typeof WsTicketResponseSchema>;
