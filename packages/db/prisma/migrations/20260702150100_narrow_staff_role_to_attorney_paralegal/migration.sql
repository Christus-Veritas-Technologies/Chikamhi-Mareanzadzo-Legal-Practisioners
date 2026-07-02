-- Fold the old ADMIN role into ATTORNEY, then narrow the StaffRole enum to just
-- ATTORNEY/PARALEGAL. Postgres can't drop a single value out of an enum in place, so this
-- follows the standard workaround: convert the data first, build a replacement enum type
-- without the retired value, repoint the column at it, then drop the old type.

-- Step 1: reassign every existing ADMIN account to ATTORNEY before the value disappears.
UPDATE "users" SET "role" = 'ATTORNEY' WHERE "role" = 'ADMIN';

-- Step 2: build the narrowed enum.
CREATE TYPE "StaffRole_new" AS ENUM ('ATTORNEY', 'PARALEGAL');

-- Step 3: repoint the column at the new type (safe now that no row is still 'ADMIN').
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "StaffRole_new" USING ("role"::text::"StaffRole_new");
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'PARALEGAL';

-- Step 4: swap the type names so the column's reported type is still "StaffRole".
DROP TYPE "StaffRole";
ALTER TYPE "StaffRole_new" RENAME TO "StaffRole";
