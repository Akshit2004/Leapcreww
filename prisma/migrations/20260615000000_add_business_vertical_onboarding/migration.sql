-- Vertical-aware navigation: businessVertical, useCaseOnboarded, navShowAllTabs

-- businessVertical: drives sidebar nav filtering ("ECOMMERCE" | "APPOINTMENT" | "GENERAL")
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "businessVertical" TEXT NOT NULL DEFAULT 'GENERAL';

-- Backfill existing orgs' businessVertical from their already-configured activeUseCase,
-- so vertical-based nav filtering doesn't hide tabs they're actively using.
UPDATE "Organization" SET "businessVertical" = 'ECOMMERCE' WHERE "activeUseCase" = 'MARKETPLACE';
UPDATE "Organization" SET "businessVertical" = 'APPOINTMENT' WHERE "activeUseCase" = 'APPOINTMENT';

-- navShowAllTabs: org-level escape hatch to show all sidebar tabs
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "navShowAllTabs" BOOLEAN NOT NULL DEFAULT false;

-- useCaseOnboarded: true once the org has completed the first-run "what's your business" picker.
-- Add with default false, then backfill existing orgs to true so they do NOT see the
-- first-run picker again. Only orgs created after this migration will default to false.
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "useCaseOnboarded" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Organization" SET "useCaseOnboarded" = true;
