import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { IpfsService } from '../services/IpfsService';
import { createLogger } from '../utils/logger';

const logger = createLogger('IPFSApi');
const ipfsService = new IpfsService();

export const ipfsRouter = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 4 * 1024 * 1024, // 4MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// POST /api/ipfs/upload-image
ipfsRouter.post(
  '/upload-image',
  upload.single('image'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      logger.info(`Uploading image: ${req.file.originalname} (${req.file.size} bytes)`);

      // Upload to IPFS via Pinata
      const imageUrl = await ipfsService.uploadImage(
        req.file.buffer,
        req.file.originalname
      );

      logger.info(`✅ Image uploaded to IPFS: ${imageUrl}`);

      res.json({
        success: true,
        imageUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      });

    } catch (error) {
      logger.error('Failed to upload image to IPFS:', error);
      next(error);
    }
  }
);

// GET /api/ipfs/test-connection
ipfsRouter.get('/test-connection', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ipfsService.testConnection();
    res.json({ success: true, message: 'IPFS connection working' });
  } catch (error) {
    logger.error('IPFS connection test failed:', error);
    next(error);
  }
}); 