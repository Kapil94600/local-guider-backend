-- ═══════════════════════════════════════════
-- User table me missing columns add karo
-- ═══════════════════════════════════════════

-- 1. provider ENUM type banao (agar nahi hai)
DO $$ BEGIN
  CREATE TYPE "enum_users_provider" AS ENUM ('LOCAL', 'GOOGLE', 'OTP');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. googleId column add karo (safe)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "googleId" VARCHAR(255);

-- 3. resetTokenHash column add karo (safe)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "resetTokenHash" VARCHAR(255);

-- 4. resetTokenExpires column add karo (safe)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "resetTokenExpires" TIMESTAMP WITH TIME ZONE;

-- 5. provider column add karo (safe, default LOCAL)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "provider" VARCHAR(20) NOT NULL DEFAULT 'LOCAL';

-- 6. provider ko ENUM type me convert karo (agar abhi VARCHAR hai)
DO $$ BEGIN
  ALTER TABLE users
    ALTER COLUMN "provider" TYPE "enum_users_provider"
    USING "provider"::"enum_users_provider";
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'provider already ENUM or conversion failed: %', SQLERRM;
END $$;

-- 7. Existing users ke liye provider set karo
UPDATE users
SET "provider" = CASE
  WHEN "googleId" IS NOT NULL THEN 'GOOGLE'
  WHEN "passwordHash" IS NULL AND "phone" IS NOT NULL THEN 'OTP'
  ELSE 'LOCAL'
END
WHERE "provider" IS NULL;

-- 8. googleId unique index add karo (agar nahi hai)
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique
  ON users("googleId")
  WHERE "googleId" IS NOT NULL;

-- 9. Verify
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('googleId', 'provider', 'resetTokenHash', 'resetTokenExpires')
ORDER BY column_name;