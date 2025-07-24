import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config, validateConfig } from './config/index';
import logger from './utils/logger';
import { walletRouter } from './api/wallet';
import { tokenRouter } from './api/token';
import { ipfsRouter } from './api/ipfs';
import { errorHandler } from './api/errorHandler';

// Validate configuration
validateConfig();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Health check
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// API routes
app.use('/api/wallet', walletRouter);
app.use('/api/token', tokenRouter);
app.use('/api/ipfs', ipfsRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  logger.info(`Launchium server running on port ${config.port}`);
  logger.info(`RPC URL: ${config.rpcUrl}`);
  logger.info(`Platform reward address: ${config.platformRewardAddress.toBase58()}`);
}); 