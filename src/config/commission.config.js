// src/config/commission.config.js
// ═══════════════════════════════════════════════════════════════
// COMMISSION CONFIGURATION
// ═══════════════════════════════════════════════════════════════
// Admin commission rates (percentage) per role
// Change these values to adjust commission without touching logic
// ═══════════════════════════════════════════════════════════════

export const COMMISSION_RATES = {
  GUIDER: 10,        // 10% commission
  PHOTOGRAPHER: 10,  // 10% commission
  USER: 0,           // No commission for regular users
  ADMIN: 0,          // No commission for admin
  DEFAULT: 10,       // Fallback if role unknown
};

// ═══════════════════════════════════════════════════════════════
// Calculate commission for a withdrawal
// ═══════════════════════════════════════════════════════════════
export const calculateCommission = (amount, role) => {
  const parsedAmount = parseFloat(amount);

  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new Error("Invalid amount for commission calculation");
  }

  const percentage = COMMISSION_RATES[role] ?? COMMISSION_RATES.DEFAULT;

  const commissionAmount = parseFloat(
    ((parsedAmount * percentage) / 100).toFixed(2)
  );
  const netAmount = parseFloat((parsedAmount - commissionAmount).toFixed(2));

  return {
    grossAmount: parsedAmount,
    percentage,
    commissionAmount,
    netAmount,
  };
};

// ═══════════════════════════════════════════════════════════════
// Format commission for display
// ═══════════════════════════════════════════════════════════════
export const formatCommissionSummary = (amount, role) => {
  const { grossAmount, percentage, commissionAmount, netAmount } =
    calculateCommission(amount, role);

  return {
    grossAmount,
    percentage,
    commissionAmount,
    netAmount,
    summary: `₹${grossAmount} - ₹${commissionAmount} (${percentage}% commission) = ₹${netAmount}`,
  };
};

export default {
  COMMISSION_RATES,
  calculateCommission,
  formatCommissionSummary,
};