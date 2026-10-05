BEGIN;
-- Never cast or truncate old embeddings: that would corrupt semantic retrieval.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Chunk") THEN
    RAISE EXCEPTION 'Existing chunks must be re-indexed with MiniLM before migration. Refusing to discard data.';
  END IF;
END $$;
ALTER TABLE "Chunk" DROP CONSTRAINT IF EXISTS "Chunk_embeddingModel_check";
ALTER TABLE "Chunk" ALTER COLUMN "embedding" TYPE vector(384);
ALTER TABLE "Chunk" ALTER COLUMN "embeddingModel" SET DEFAULT 'Xenova/all-MiniLM-L6-v2';
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_embeddingModel_check" CHECK ("embeddingModel" = 'Xenova/all-MiniLM-L6-v2');
COMMIT;
