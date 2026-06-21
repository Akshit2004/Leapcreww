-- Lead capture: storefront/quiz lead + pre-compiled result, delivered over WhatsApp.
CREATE TABLE IF NOT EXISTS "LeadSubmission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactId" TEXT,
    "source" TEXT NOT NULL,
    "attributes" JSONB NOT NULL,
    "result" TEXT NOT NULL,
    "resultDelivered" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LeadSubmission_organizationId_createdAt_idx" ON "LeadSubmission"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "LeadSubmission_contactId_idx" ON "LeadSubmission"("contactId");

ALTER TABLE "LeadSubmission" ADD CONSTRAINT "LeadSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadSubmission" ADD CONSTRAINT "LeadSubmission_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
