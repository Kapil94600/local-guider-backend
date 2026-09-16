import {
  findWalletByUserId,
  getTransactionsByWalletId,
  getAllWallets,
  createTransaction,
} from "./wallet.repository.js";

export const getWallet = async (userId) => {
  const wallet = await findWalletByUserId(userId);
  if (!wallet) throw new Error("Wallet not found");
  return wallet;
};

export const getWalletTransactions = async (userId) => {
  const wallet = await findWalletByUserId(userId);
  if (!wallet) throw new Error("Wallet not found");
  return await getTransactionsByWalletId(wallet.id);
};

export const getAllWalletsService = async ({ page = 1, limit = 10 } = {}) => {
  return await getAllWallets({ page, limit });
};

export const updateWalletBalanceService = async (userId, amount, type = 'CREDIT', description = '') => {
  const wallet = await findWalletByUserId(userId);
  if (!wallet) throw new Error("Wallet not found");

  const newBalance = type === 'CREDIT'
    ? parseFloat(wallet.balance) + parseFloat(amount)
    : parseFloat(wallet.balance) - parseFloat(amount);

  if (newBalance < 0) throw new Error("Insufficient balance");

  await wallet.update({ balance: newBalance });

  await createTransaction({
    walletId: wallet.id,
    transactionType: type,
    amount: parseFloat(amount),
    balanceAfter: newBalance,
    description: description || 'Admin adjustment',
  });

  return wallet;
};