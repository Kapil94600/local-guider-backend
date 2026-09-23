-- Add RAZORPAY_PAYMENT enum value
ALTER TYPE "enum_wallet_transactions_transactionType"
  ADD VALUE IF NOT EXISTS 'RAZORPAY_PAYMENT';

-- Add processedById column
ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS "processedById" UUID;

-- Index for audit queries
CREATE INDEX IF NOT EXISTS withdrawal_processed_by_idx
  ON withdrawal_requests("processedById")
  WHERE "processedById" IS NOT NULL;