-- Add canvas position columns to ChatbotNode.
-- ADD COLUMN IF NOT EXISTS is a no-op when the column already exists, so this
-- is safe regardless of prior database state.
ALTER TABLE "ChatbotNode" ADD COLUMN IF NOT EXISTS "positionX" DOUBLE PRECISION;
ALTER TABLE "ChatbotNode" ADD COLUMN IF NOT EXISTS "positionY" DOUBLE PRECISION;

-- Make nullable and set a default so INSERTs that omit the field don't fail.
-- DROP NOT NULL on an already-nullable column is a no-op in PostgreSQL.
ALTER TABLE "ChatbotNode" ALTER COLUMN "positionX" DROP NOT NULL;
ALTER TABLE "ChatbotNode" ALTER COLUMN "positionX" SET DEFAULT 100;
ALTER TABLE "ChatbotNode" ALTER COLUMN "positionY" DROP NOT NULL;
ALTER TABLE "ChatbotNode" ALTER COLUMN "positionY" SET DEFAULT 100;

-- Create AutomationQueue if it was not yet created.
CREATE TABLE IF NOT EXISTS "AutomationQueue" (
    "id"             TEXT         NOT NULL,
    "automationId"   TEXT         NOT NULL,
    "contactId"      TEXT         NOT NULL,
    "contactPhone"   TEXT         NOT NULL,
    "contactName"    TEXT         NOT NULL,
    "stepIndex"      INTEGER      NOT NULL,
    "stepData"       JSONB        NOT NULL,
    "scheduledAt"    TIMESTAMP(3) NOT NULL,
    "processed"      BOOLEAN      NOT NULL DEFAULT false,
    "organizationId" TEXT         NOT NULL,

    CONSTRAINT "AutomationQueue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AutomationQueue_organizationId_processed_scheduledAt_idx"
    ON "AutomationQueue"("organizationId", "processed", "scheduledAt");
CREATE INDEX IF NOT EXISTS "AutomationQueue_scheduledAt_processed_idx"
    ON "AutomationQueue"("scheduledAt", "processed");

-- Add FK only when it does not already exist (guards against partial prior applies).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'AutomationQueue_organizationId_fkey'
      AND table_name       = 'AutomationQueue'
  ) THEN
    ALTER TABLE "AutomationQueue"
      ADD CONSTRAINT "AutomationQueue_organizationId_fkey"
      FOREIGN KEY ("organizationId")
      REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
