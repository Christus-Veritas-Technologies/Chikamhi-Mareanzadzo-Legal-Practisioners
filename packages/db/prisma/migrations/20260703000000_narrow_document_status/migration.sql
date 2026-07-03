-- Drop DRAFT and UNDER_REVIEW from DocumentStatus, leaving only FILED, SIGNED, EXECUTED.
-- Postgres can't drop a single value out of an enum in place, so this follows the same
-- workaround used for StaffRole: migrate the data first, build a replacement enum type
-- without the retired values, repoint the column at it, then drop the old type.

-- Step 1: fold DRAFT and UNDER_REVIEW documents into FILED before the values disappear.
UPDATE "documents" SET "status" = 'FILED' WHERE "status" IN ('DRAFT', 'UNDER_REVIEW');

-- Step 2: build the narrowed enum.
CREATE TYPE "DocumentStatus_new" AS ENUM ('FILED', 'SIGNED', 'EXECUTED');

-- Step 3: repoint the column at the new type (safe now that no row is DRAFT/UNDER_REVIEW).
ALTER TABLE "documents" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "documents" ALTER COLUMN "status" TYPE "DocumentStatus_new" USING ("status"::text::"DocumentStatus_new");
ALTER TABLE "documents" ALTER COLUMN "status" SET DEFAULT 'FILED';

-- Step 4: swap the type names so the column's reported type is still "DocumentStatus".
DROP TYPE "DocumentStatus";
ALTER TYPE "DocumentStatus_new" RENAME TO "DocumentStatus";
