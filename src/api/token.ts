import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { TokenService } from '../services/TokenService';
import { validatePublicKey } from '../utils/validation';
import { createLogger } from '../utils/logger';
import { config } from '../config/index';

const logger = createLogger('TokenAPI');

export const tokenRouter = Router();

// Timeout middleware for API calls
const timeoutMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({
        success: false,
        error: 'Request timeout - API call took too long',
        timeout: config.apiTimeout,
      });
    }
  }, config.apiTimeout);

  res.on('finish', () => {
    clearTimeout(timeout);
  });

  next();
};

// POST /api/token/prepare - Prepare token transaction for user signature
tokenRouter.post(
  '/prepare',
  timeoutMiddleware,
  [
    body('userWallet').notEmpty().custom((value) => {
      const pubkey = validatePublicKey(value);
      if (!pubkey) throw new Error('Invalid wallet address');
      return true;
    }),
    body('name').notEmpty().isLength({ min: 1, max: 32 }),
    body('symbol').notEmpty().isLength({ min: 1, max: 10 }),
    body('description').optional().isLength({ min: 1, max: 200 }),
    body('imageUrl').optional().custom((value) => {
      if (!value) return true;
      
      if (value.startsWith('data:image/')) return true;
      
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error('Invalid image URL');
      }
    }),
    body('imageUpload').optional(),
    body('website').optional({ checkFalsy: true }).isURL(),
    body('twitter').optional({ checkFalsy: true }).isURL(),
    body('telegram').optional({ checkFalsy: true }).isURL(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const prepareRequest = req.body;
      
      logger.info('Token preparation request received:', {
        userWallet: prepareRequest.userWallet,
        name: prepareRequest.name,
        symbol: prepareRequest.symbol,
        hasImage: !!prepareRequest.imageUpload,
        imageSize: prepareRequest.imageUpload ? prepareRequest.imageUpload.length : 0,
        requestBodySize: JSON.stringify(req.body).length
      });
      
      const tokenService = new TokenService();
      const result = await tokenService.prepareTokenTransaction(prepareRequest);
      
      res.json(result);
    } catch (error) {
      logger.error('Failed to prepare token:', error);
      logger.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type',
        requestBody: req.body
      });
      next(error);
    }
  }
);

// POST /api/token/execute - Execute signed transaction
tokenRouter.post(
  '/execute',
  timeoutMiddleware,
  [
    body('sessionId').notEmpty(),
    body('signedTransaction').notEmpty(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const executeRequest = req.body;
      
      logger.info('Token execution request received:', {
        sessionId: executeRequest.sessionId,
        hasSignedTransaction: !!executeRequest.signedTransaction
      });
      
      const tokenService = new TokenService();
      const result = await tokenService.executeTokenTransaction(executeRequest);
      
      res.json(result);
    } catch (error) {
      logger.error('Failed to execute token:', error);
      logger.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type',
        requestBody: req.body
      });
      next(error);
    }
  }
);

// POST /api/token/launch - Simple token mint (LEGACY - backward compatibility)
tokenRouter.post(
  '/launch',
  timeoutMiddleware,
  [
    body('userWallet').notEmpty().custom((value) => {
      const pubkey = validatePublicKey(value);
      if (!pubkey) throw new Error('Invalid wallet address');
      return true;
    }),
    body('name').notEmpty().isLength({ min: 1, max: 32 }),
    body('symbol').notEmpty().isLength({ min: 1, max: 10 }),
    body('description').notEmpty().isLength({ min: 1, max: 200 }),
    body('imageUrl').optional().custom((value) => {
      if (!value) return true;
      
      if (value.startsWith('data:image/')) return true;
      
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error('Invalid image URL');
      }
    }),
    body('imageUpload').optional(),
    body('website').optional({ checkFalsy: true }).isURL(),
    body('twitter').optional({ checkFalsy: true }).isURL(),
    body('telegram').optional({ checkFalsy: true }).isURL(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const launchRequest = req.body;
      
      // Log request details for debugging
      logger.info('Token launch request received:', {
        userWallet: launchRequest.userWallet,
        name: launchRequest.name,
        symbol: launchRequest.symbol,
        hasImage: !!launchRequest.imageUpload,
        imageSize: launchRequest.imageUpload ? launchRequest.imageUpload.length : 0,
        requestBodySize: JSON.stringify(req.body).length
      });
      
      const tokenService = new TokenService();
      const result = await tokenService.launchToken(launchRequest);
      
      res.json(result);
    } catch (error) {
      logger.error('Failed to launch token:', error);
      logger.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type',
        requestBody: req.body
      });
      next(error);
    }
  }
);

// GET /api/token/status/:mint
tokenRouter.get(
  '/status/:mint',
  [
    param('mint').custom((value) => {
      const pubkey = validatePublicKey(value);
      if (!pubkey) throw new Error('Invalid mint address');
      return true;
    }),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tokenService = new TokenService();
      const status = await tokenService.getTokenStatus(req.params.mint);
      res.json(status);
    } catch (error) {
      logger.error('Failed to get token status:', error);
      next(error);
    }
  }
);

// GET /api/token/standards
tokenRouter.get('/standards', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenService = new TokenService();
    const standards = tokenService.getTokenStandards();
    res.json(standards);
  } catch (error) {
    logger.error('Failed to get token standards:', error);
    next(error);
  }
});

// GET /api/token/stats
tokenRouter.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenService = new TokenService();
    const stats = await tokenService.getLaunchStatistics();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get launch statistics:', error);
    next(error);
  }
}); 