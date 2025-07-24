import { PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server settings
  port: parseInt(process.env.PORT || '8080', 10),

  // Solana RPC
  rpcUrl: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
  commitment: process.env.COMMITMENT || 'confirmed',

  // Master wallet (holds mint authority)
  masterWalletSecret: process.env.MASTER_WALLET_SECRET!,

  // Platform reward address (receives 0.5% LP rewards)
  platformRewardAddress: new PublicKey(
    process.env.PLATFORM_REWARD_ADDRESS || '11111111111111111111111111111111'
  ),

  // Token settings
  defaultDecimals: 9,
  defaultSupply: 1_000_000_000_000_000_000n, // 1 billion with 9 decimals

  // Launch fee (in lamports)
  launchFeeLamports: Math.floor(
    parseFloat(process.env.LAUNCH_FEE_SOL || '0.1') * 1_000_000_000
  ),

  // SPL Token Program ID (Standard)
  tokenProgramId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),

  // Metaplex Token Metadata Program ID
  metadataProgramId: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),

  // IPFS Configuration (Pinata)
  pinataApiKey: process.env.PINATA_API_KEY || '',
  pinataApiSecret: process.env.PINATA_API_SECRET || '',
  pinataJwt: process.env.PINATA_JWT || '',

  // Meteora DLMM Program ID
  meteoraDlmmProgramId: new PublicKey('LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'),

  // DBC Configuration
  dbcConfigKey: process.env.DBC_CONFIG_KEY || '',

  // Timeout & Performance Settings
  apiTimeout: parseInt(process.env.API_TIMEOUT || '120000', 10),
  transactionTimeout: parseInt(process.env.TRANSACTION_TIMEOUT || '60000', 10),
  connectionTimeout: parseInt(process.env.CONNECTION_TIMEOUT || '30000', 10),
  confirmationTimeout: parseInt(process.env.CONFIRMATION_TIMEOUT || '45000', 10),
  
  // RPC Connection Configuration
  rpcConfig: {
    confirmTransactionInitialTimeout: parseInt(process.env.TRANSACTION_TIMEOUT || '60000', 10),
    disableRetryOnRateLimit: false,
    commitment: (process.env.COMMITMENT || 'confirmed') as any,
    httpHeaders: {
      'Content-Type': 'application/json',
    },
  },
};

// Validate required environment variables
export function validateConfig(): void {
  if (!process.env.MASTER_WALLET_SECRET) {
    throw new Error('MASTER_WALLET_SECRET is required');
  }

  if (!process.env.PLATFORM_REWARD_ADDRESS) {
    throw new Error('PLATFORM_REWARD_ADDRESS is required');
  }

  if (!process.env.RPC_URL) {
    throw new Error('RPC_URL is required');
  }
} 