-- Additive migration: legacy documents remain unassigned and are never exposed.
CREATE TABLE "User" ("id" TEXT PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL, "passwordHash" TEXT, "isDemo" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "Session" ("tokenHash" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
ALTER TABLE "Document" ADD COLUMN "ownerId" TEXT REFERENCES "User"("id") ON DELETE CASCADE;
CREATE INDEX "Document_ownerId_createdAt_idx" ON "Document"("ownerId", "createdAt");
CREATE TABLE "Requirement" ("id" TEXT PRIMARY KEY, "documentId" INTEGER NOT NULL REFERENCES "Document"("id") ON DELETE CASCADE, "title" TEXT NOT NULL, "category" TEXT NOT NULL, "quote" TEXT NOT NULL, "done" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "Requirement_documentId_idx" ON "Requirement"("documentId");
CREATE TABLE "Answer" ("id" TEXT PRIMARY KEY, "documentId" INTEGER NOT NULL REFERENCES "Document"("id") ON DELETE CASCADE, "question" TEXT NOT NULL, "result" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "Answer_documentId_createdAt_idx" ON "Answer"("documentId", "createdAt");
CREATE TABLE "RateLimit" ("key" TEXT PRIMARY KEY, "count" INTEGER NOT NULL DEFAULT 1, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");
