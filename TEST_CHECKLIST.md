# Withdrawal + Commission Test Checklist

## Pre-Test Setup
1. Run migration: `psql $DATABASE_URL -f migrations/001_add_commission_fields.sql`
2. Restart backend server
3. Create test user (Guider) with wallet balance ₹500

## Test 1: Submit Withdrawal
- [ ] POST /api/v1/withdrawal/request
- [ ] Body: `{ amount: 100, accountName: "Test", accountNumber: "1234567890", bankName: "SBI", ifscCode: "SBIN0001234" }`
- [ ] Expected response:
  - `amount: 100`
  - `commissionPercentage: 10`
  - `commissionAmount: 10`
  - `netAmount: 90`
  - `status: "PENDING"`
- [ ] Check wallet: balance should be **400** (500 - 100 held)

## Test 2: Get My Requests
- [ ] GET /api/v1/withdrawal/my
- [ ] Expected: List with 1 request showing commission breakdown

## Test 3: Admin — Get All
- [ ] GET /api/v1/withdrawal/all (as ADMIN)
- [ ] Expected: User info included (no crash — the alias bug fix)

## Test 4: Admin — Approve
- [ ] PUT /api/v1/withdrawal/:id/status
- [ ] Body: `{ status: "APPROVED" }`
- [ ] Expected:
  - Request status → APPROVED
  - Wallet: still 400 (already held)
  - WalletTransaction has 2 records:
    - WITHDRAWAL: net amount (₹90)
    - COMMISSION: ₹10
- [ ] User receives notification

## Test 5: Admin — Reject
- [ ] Create new withdrawal (₹100)
- [ ] Wallet → 300 (held 200 total for 2 requests... wait, only 1 pending allowed)
- [ ] PUT /api/v1/withdrawal/:id/status
- [ ] Body: `{ status: "REJECTED", adminMessage: "Invalid bank" }`
- [ ] Expected:
  - Wallet: refunded → +100
  - User receives notification with reason

## Test 6: Wallet Endpoints (BUG FIX)
- [ ] GET /api/v1/wallet — should return user wallet (was 404)
- [ ] GET /api/v1/wallet/transactions — should return transactions
- [ ] GET /api/v1/wallet/all (admin) — should return all wallets
- [ ] PUT /api/v1/wallet/:userId/balance (admin) — should credit/debit

## Test 7: Edge Cases
- [ ] Withdrawal < ₹100 → error
- [ ] Withdrawal > balance → error
- [ ] Second pending request → error (409)
- [ ] Invalid IFSC → error

## Rollback Plan
If issues:
1. Revert withdrawal.service.js to previous version
2. Revert WithdrawalRequest.js model
3. Migration is additive (safe — old columns still work)