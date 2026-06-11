-- Remove string timestamp columns (both models have createdAt as the real timestamp)
ALTER TABLE "Message" DROP COLUMN IF EXISTS "timestamp";
ALTER TABLE "SystemLog" DROP COLUMN IF EXISTS "timestamp";

-- Make Contact.email optional
ALTER TABLE "Contact" ALTER COLUMN "email" DROP NOT NULL;

-- Swap unique constraint: org+phone instead of org+email
DROP INDEX IF EXISTS "Contact_organizationId_email_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Contact_organizationId_phone_key" ON "Contact"("organizationId", "phone");

-- Append-only event log
CREATE TABLE IF NOT EXISTS "Event" (
  "id"             TEXT NOT NULL,
  "type"           TEXT NOT NULL,
  "payload"        JSONB NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Event" DROP CONSTRAINT IF EXISTS "Event_organizationId_fkey";
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Event_organizationId_createdAt_idx" ON "Event"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "Event_organizationId_type_createdAt_idx" ON "Event"("organizationId", "type", "createdAt");
