import type { Prisma, User, Session, Requirement } from '@prisma/client';
export type PublicUser = Pick<User, 'id' | 'name' | 'isDemo'> & { email: string | null };
export type AuthAction = { action: 'login' | 'signup'; email: string; password: string; name?: string } | { action: 'demo' | 'logout' };
export type BriefMutation = { action: 'create'; title: string; content: string } | { action: 'extract' | 'index'; documentId: number } | { documentId: number; requirementId: string; done: boolean };
export type ChecklistItem = Pick<Requirement, 'id' | 'title' | 'category' | 'quote' | 'done'>;
export type StoredSession = Pick<Session, 'tokenHash' | 'userId' | 'expiresAt'>;
// Compile checked persistence contracts against the generated Prisma schema.
export const userSelect = { id: true, name: true, isDemo: true, email: true } satisfies Prisma.UserSelect;
export const briefSelect = { id: true, title: true, ownerId: true, content: true, requirements: true, answers: true } satisfies Prisma.DocumentSelect;
export const requirementUpdate = { done: true } satisfies Prisma.RequirementUpdateManyMutationInput;
