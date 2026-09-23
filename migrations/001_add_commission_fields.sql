-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: Add commission fields to withdrawal_requests
-- ═══════════════════════════════════════════════════════════════
-- Safe for production:
--   - All new columns have DEFAULT values
--   - Existing rows will get default values
--   - No data loss
-- ═══════════════════════════════════════════════════════════════

-- 1. Commission percentage (e.g. 10.00)
ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS "commissionPercentage" DECIMAL(5, 2) NOT NULL DEFAULT 0;

-- 2. Commission amount deducted by admin (e.g. 10.00)
ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS "commissionAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- 3. Net amount user will receive in bank (e.g. 90.00)
ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS "netAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- 4. Backfill existing PENDING requests with computed values
--    (assume gross amount = amount, commission = 0 for legacy)
UPDATE withdrawal_requests
SET
  "commissionPercentage" = 0,
  "commissionAmount" = 0,
  "netAmount" = amount
WHERE "netAmount" = 0 AND "commissionAmount" = 0;

-- 5. Verify
SELECT
  column_name,
  data_type,
  numeric_precision,
  numeric_scale,
  column_default
FROM information_schema.columns
WHERE table_name = 'withdrawal_requests'
  AND column_name IN ('commissionPercentage', 'commissionAmount', 'netAmount')
ORDER BY column_name;