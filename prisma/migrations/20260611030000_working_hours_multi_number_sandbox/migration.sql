-- P1-6: Working hours on Organization
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "workingHours" JSONB;

-- P1-11: Multi-number support
CREATE TABLE IF NOT EXISTS "PhoneNumber" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "whatsappBusinessAccountId" TEXT,
    "accessToken" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhoneNumber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PhoneNumber_organizationId_phoneNumberId_key"
    ON "PhoneNumber"("organizationId", "phoneNumberId");

CREATE INDEX IF NOT EXISTS "PhoneNumber_organizationId_idx"
    ON "PhoneNumber"("organizationId");

ALTER TABLE "PhoneNumber"
    ADD CONSTRAINT "PhoneNumber_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- P2-16: Sandbox keys
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "isSandbox" BOOLEAN NOT NULL DEFAULT false;
