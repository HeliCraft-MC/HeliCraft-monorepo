import { z } from '@hono/zod-openapi';
import { LocaleSchema } from '../localized-content/contracts';
import { ClientConnection, ConnectionDetails } from './connection';

const MAX_SERVICE_TOKEN = 128;
const CODE_LENGTH = 16;
const SECRET_LENGTH = 43;
const MinecraftName = z.string().regex(/^[A-Za-z0-9_]{3,16}$/u);
const ConnectionInput = z.strictObject({
  username: MinecraftName,
  connectionId: z.uuid(),
  client: ClientConnection.optional(),
});
const ProofInput = z.strictObject({
  connectionId: z.uuid(),
  verifier: z
    .string()
    .length(SECRET_LENGTH)
    .regex(/^[\w-]+$/u),
});
const ChallengeStatus = z.enum([
  'WAITING_AUTH',
  'APPROVED',
  'CONSUMED',
  'REJECTED',
  'EXPIRED',
  'DISCONNECTED',
]);
const ChallengeView = z
  .object({
    id: z.uuid(),
    username: MinecraftName,
    createdAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    status: ChallengeStatus,
    connection: ConnectionDetails.nullable(),
  })
  .openapi('MinecraftChallenge');
const IssuedChallenge = ChallengeView.extend({
  accountId: z.uuid(),
  verifier: z.string(),
  code: z.string(),
  confirmationUrl: z.url(),
  serverName: z.string(),
}).openapi('MinecraftIssuedChallenge');
const DecisionInput = z.strictObject({
  decision: z.enum(['APPROVE', 'REJECT']),
  locale: LocaleSchema.optional(),
  code: z
    .string()
    .length(CODE_LENGTH)
    .regex(/^[\dA-Fa-f]+$/u)
    .optional(),
});
const SessionView = z
  .object({
    id: z.uuid(),
    accountId: z.uuid(),
    username: MinecraftName,
    joinedAt: z.iso.datetime().nullable(),
    endedAt: z.iso.datetime().nullable(),
    expiresAt: z.iso.datetime(),
    online: z.boolean(),
  })
  .openapi('MinecraftSession');
const Admission = z
  .object({ session: SessionView, backendId: z.string() })
  .openapi('MinecraftAdmission');
const PaperIdentity = z.strictObject({ accountId: z.uuid(), username: MinecraftName });
const SessionInput = z.strictObject({ sessionId: z.uuid() });
const Profile = z
  .object({
    accountId: z.uuid(),
    username: MinecraftName,
    serverName: z.string(),
    states: z.array(z.string()),
    locale: LocaleSchema,
  })
  .openapi('MinecraftProfile');
const EventView = z.object({
  id: z.uuid(),
  type: z.enum(['MINECRAFT_SESSION_STARTED', 'MINECRAFT_SESSION_ENDED']),
  occurredAt: z.iso.datetime(),
  reason: z.string().nullable(),
});
const AccountMinecraft = z
  .object({
    accountId: z.uuid(),
    username: MinecraftName,
    challenges: z.array(ChallengeView),
    session: SessionView.nullable(),
    lastJoinedAt: z.iso.datetime().nullable(),
    events: z.array(EventView),
  })
  .openapi('AccountMinecraft');
const IdParams = z.object({ id: z.uuid() });
const ServiceActorSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]{1,64}$/u),
  role: z.enum(['RIGEL', 'DENEB']),
  backendId: z.string().regex(/^[a-z0-9-]{1,64}$/u),
  token: z
    .string()
    .min(SECRET_LENGTH)
    .max(MAX_SERVICE_TOKEN)
    .regex(/^[A-Za-z0-9_-]+$/u),
});
type ServiceActor = z.infer<typeof ServiceActorSchema>;
type ChallengeDecision = z.infer<typeof DecisionInput>;
type ChallengeRecord = z.infer<typeof ChallengeView>;
type GameSession = z.infer<typeof SessionView>;
type ConnectionRequest = z.infer<typeof ConnectionInput>;
type IssuedConnection = z.infer<typeof IssuedChallenge>;
export {
  MinecraftName,
  ConnectionInput,
  ProofInput,
  ChallengeStatus,
  ChallengeView,
  IssuedChallenge,
  DecisionInput,
  SessionView,
  Admission,
  PaperIdentity,
  SessionInput,
  Profile,
  AccountMinecraft,
  IdParams,
  ServiceActorSchema,
  type ServiceActor,
  type ChallengeDecision,
  type ChallengeRecord,
  type GameSession,
  type ConnectionRequest,
  type IssuedConnection,
};
