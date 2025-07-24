import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { config } from '../config/index';
import { CreateWalletResponse } from '../models/index';
import { createLogger } from '../utils/logger';

const logger = createLogger('WalletService');

export class WalletService {
  createWallet(): CreateWalletResponse {
    try {
      // Generate new keypair
      const keypair = Keypair.generate();
      
      // Get the public key
      const publicKey = keypair.publicKey;
      
      // Convert secret key to base58 for easy storage
      const secretKey = bs58.encode(keypair.secretKey);
      
      logger.info(`Created new wallet: ${publicKey.toBase58()}`);
      
      return {
        walletAddress: publicKey.toBase58(),
        privateKey: secretKey,
        message: 'Wallet created successfully. Keep your private key safe!',
      };
    } catch (error) {
      logger.error('Failed to create wallet:', error);
      throw new Error('Failed to create wallet');
    }
  }

  getMasterKeypair(): Keypair {
    try {
      logger.info('🔧 Attempting to parse master wallet secret...');
      logger.info('Secret exists:', !!config.masterWalletSecret);
      logger.info('Secret length:', config.masterWalletSecret?.length || 'undefined');
      logger.info('Secret first 50 chars:', config.masterWalletSecret?.substring(0, 50) + '...');
      
      let secretKey: Uint8Array;
      
      // Handle both base58 string and JSON array formats
      if (config.masterWalletSecret.startsWith('[') && config.masterWalletSecret.endsWith(']')) {
        // JSON array format: [84,107,29,174,...]
        logger.info('🔧 Detected JSON array format');
        const secretArray = JSON.parse(config.masterWalletSecret);
        secretKey = new Uint8Array(secretArray);
        logger.info('✅ JSON array parsed, length:', secretArray.length);
      } else {
        // Base58 string format: 2gtjzGEe3YEa1hBc6MjAAyw...
        logger.info('🔧 Detected base58 string format');
        secretKey = bs58.decode(config.masterWalletSecret);
        logger.info('✅ Base58 decoded, length:', secretKey.length);
      }
      
      // Create keypair from secret key
      const keypair = Keypair.fromSecretKey(secretKey);
      logger.info('✅ Keypair created successfully:', keypair.publicKey.toBase58());
      
      return keypair;
    } catch (error) {
      logger.error('❌ Master wallet parsing failed:', error);
      logger.error('Config masterWalletSecret value (first 100 chars):', config.masterWalletSecret?.substring(0, 100));
      logger.error('Error type:', error.constructor.name);
      logger.error('Error message:', error.message);
      throw new Error('Failed to create keypair from master wallet secret');
    }
  }
} 