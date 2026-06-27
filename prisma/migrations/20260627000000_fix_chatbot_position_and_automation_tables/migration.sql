-- Fix ChatbotNode positionX/positionY columns.
-- These may already exist in the production database (added via db push before migration
-- tracking began), but without a DEFAULT so INSERTs that omit them fail with P2011.
-- ADD COLUMN IF NOT EXISTS is a no-op when the column already exists, so this is safe
-- in both cases (column present or absent).
ALTER TABLE "ChatbotNode" ADD COLUMN IF NOT EXISTS "positionX" DOUBLE PRECISION;
ALTER TABLE "ChatbotNode" ADD COLUMN IF NOT EXISTS "positionY" DOUBLE PRECISION;

-- Ensure no NOT NULL constraint blocks INSERTs that omit the field, and provide a
-- sensible default so the column is auto-populated when omitted.
ALTER TABLE "ChatbotNode" ALTER COLUMN "positionX" DROP NOT NULL;
ALTER TABLE "ChatbotNode" ALTER COLUMN "positionX" SET DEFAULT 100;
ALTER TABLE "ChatbotNode" ALTER COLUMN "positionY" DROP NOT NULL;
ALTER TABLE "ChatbotNode" ALTER COLUMN "positionY" SET DEFAULT 100;

-- CreateTable: Automation (was added to schema.prisma but never migrated)
CREATE TABLE IF NOT EXISTS "Automation" (
    "id"             TEXT        NOT NULL,
    "name"           TEXT        NOT NULL,
    "organizationId" TEXT        NOT NULL,
    "triggerType"    TEXT        NOT NULL,
    "triggerConfig"  JSONB       NOT NULL DEFAULT '{}',
    "steps"          JSONB       NOT NULL DEFAULT '[]',
    "templateName"   TEXT        NOT NULL DEFAULT '',
    "templateParams" JSONB       NOT NULL DEFAULT '[]',
    "isActive"       BOOLEAN     NOT NULL DEFAULT true,
    "runCount"       INTEGER     NOT NULL DEFAULT 0,
    "lastRunAt"      TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AutomationQueue (was added to schema.prisma but never migrated)
CREATE TABLE IF NOT EXISTS "AutomationQueue" (
    "id"             TEXT        NOT NULL,
    "automationId"   TEXT        NOT NULL,
    "contactId"      TEXT        NOT NULL,
    "contactPhone"   TEXT        NOT NULL,
    "contactName"    TEXT        NOT NULL,
    "stepIndex"      INTEGER     NOT NULL,
    "stepData"       JSONB       NOT NULL,
    "scheduledAt"    TIMESTAMP(3) NOT NULL,
    "processed"      BOOLEAN     NOT NULL DEFAULT false,
    "organizationId" TEXT        NOT NULL,

    CONSTRAINT "AutomationQueue_pkey" PRIMARY KEY ("id")
);

-- Indexes for Automation
CREATE INDEX IF NOT EXISTS "Automation_organizationId_isActive_idx"    ON "Automation"("organizationId", "isActive");
CREATE INDEX IF NOT EXISTS "Automation_organizationId_triggerType_idx" ON "Automation"("organizationId", "triggerType");

-- Indexes for AutomationQueue
CREATE INDEX IF NOT EXISTS "AutomationQueue_organizationId_processed_scheduledAt_idx" ON "AutomationQueue"("organizationId", "processed", "scheduledAt");
CREATE INDEX IF NOT EXISTS "AutomationQueue_scheduledAt_processed_idx"               ON "AutomationQueue"("scheduledAt", "processed");

-- Foreign keys (IF NOT EXISTS guard handled by the table being newly created above)
ALTER TABLE "Automation"      ADD CONSTRAINT "Automation_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutomationQueue" ADD CONSTRAINT "AutomationQueue_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
