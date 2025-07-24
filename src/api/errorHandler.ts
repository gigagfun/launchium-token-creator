import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../models/index';
import logger from '../utils/logger';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Error occurred:', err);

  const errorResponse: ErrorResponse = {
    error: err.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  };

  res.status(500).json(errorResponse);
} 