BEGIN;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE "Document" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "pageCount" INTEGER NOT NULL CHECK ("pageCount" >= 0),
  "sizeBytes" INTEGER NOT NULL CHECK ("sizeBytes" >= 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Chunk" (
  "id" SERIAL PRIMARY KEY,
  "documentId" INTEGER NOT NULL,
  "index" INTEGER NOT NULL CHECK ("index" >= 0),
  "text" TEXT NOT NULL CHECK (length(btrim("text")) > 0),
  "tokenCount" INTEGER NOT NULL CHECK ("tokenCount" BETWEEN 1 AND 500),
  "startToken" INTEGER NOT NULL CHECK ("startToken" >= 0),
  "endToken" INTEGER NOT NULL CHECK ("endToken" > "startToken"),
  "embeddingModel" TEXT NOT NULL DEFAULT 'text-embedding-ada-002' CHECK ("embeddingModel" = 'text-embedding-ada-002'),
  "embedding" vector(1536) NOT NULL,
  CONSTRAINT "Chunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Chunk_documentId_index_key" ON "Chunk"("documentId", "index");
COMMIT;
