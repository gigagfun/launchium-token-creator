import { Router } from 'express';
import { WalletService } from '../services/WalletService';
import { createLogger } from '../utils/logger';

const logger = createLogger('WalletAPI');
const walletService = new WalletService();

export const walletRouter = Router();

// POST /api/wallet/create
walletRouter.post('/create', async (_req, res, next) => {
  try {
    const walletInfo = walletService.createWallet();
    res.json(walletInfo);
  } catch (error) {
    logger.error('Failed to create wallet:', error);
    next(error);
  }
}); 