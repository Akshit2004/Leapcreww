-- Shared RTO fraud network: anonymized cross-merchant risk signals.
CREATE TABLE IF NOT EXISTS "NetworkSignal" (
    "id" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "signal" TEXT NOT NULL,
    "category" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NetworkSignal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NetworkSignal_phoneHash_idx" ON "NetworkSignal"("phoneHash");
CREATE INDEX IF NOT EXISTS "NetworkSignal_organizationId_phoneHash_idx" ON "NetworkSignal"("organizationId", "phoneHash");
