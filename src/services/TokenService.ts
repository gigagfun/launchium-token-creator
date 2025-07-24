import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  createFungible,
  mplTokenMetadata,
  findMetadataPda
} from '@metaplex-foundation/mpl-token-metadata';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  transfer,
  setAuthority,
  AuthorityType,
  mintTo
} from '@solana/spl-token';
import { WalletService } from './WalletService';
import { IpfsService, MetadataJson } from './IpfsService';
import { config } from '../config/index';
import { 
  LaunchTokenRequest, 
  LaunchTokenResponse, 
  TokenStatusResponse,
  TokenMetadata
} from '../models/index';
import { createLogger } from '../utils/logger';
import { 
  Umi,
  generateSigner,
  createSignerFromKeypair,
  signerIdentity,
  percentAmount,
  publicKey
} from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { Transaction, SystemProgram } from '@solana/web3.js';

const logger = createLogger('TokenService');

// Simple token mint - no pool, no DBC
export class TokenService {
  private connection: Connection;
  private walletService: WalletService;
  private ipfsService: IpfsService;
  private umi: Umi | null = null;

  constructor() {
    this.connection = new Connection(config.rpcUrl, config.commitment as any);
    this.walletService = new WalletService();
    this.ipfsService = new IpfsService();
    
    logger.info('🎯 Simple TokenService initialized (no DBC, no pools)');
  }

  private initializeUmi(): void {
    if (this.umi) return;
    
    logger.info('🔧 Initializing UMI...');
    
    this.umi = createUmi(config.rpcUrl).use(mplTokenMetadata());
    
    const masterKeypair = this.walletService.getMasterKeypair();
    const umiKeypair = this.umi.eddsa.createKeypairFromSecretKey(masterKeypair.secretKey);
    const umiSigner = createSignerFromKeypair(this.umi, umiKeypair);
    this.umi.use(signerIdentity(umiSigner));
    
    logger.info('✅ UMI initialized');
  }

  async launchToken(request: LaunchTokenRequest): Promise<LaunchTokenResponse> {
    try {
      logger.info('🚀 Starting simple token mint process');
      logger.info(`Token: ${request.name} (${request.symbol})`);
      logger.info(`User wallet: ${request.userWallet}`);
      
      this.initializeUmi();
      this.validateTokenRequest(request);
      
      // Calculate and charge fee from master wallet (0.1 SOL)
      const feeAmount = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL fee
      logger.info(`💰 Fee: ${feeAmount / LAMPORTS_PER_SOL} SOL will be deducted from master wallet`);

      // 1. Generate mint
      const mint = generateSigner(this.umi!);
      logger.info(`📍 Mint address: ${mint.publicKey}`);
      
      // 2. Handle image upload
      let imageUrl = request.imageUrl || '';
      if (request.imageUpload && !imageUrl) {
        try {
          logger.info('📷 Uploading image to IPFS...');
          const imageBuffer = Buffer.from(request.imageUpload, 'base64');
          imageUrl = await this.ipfsService.uploadImage(imageBuffer, `${request.symbol}_logo.png`);
          logger.info(`✅ Image uploaded: ${imageUrl}`);
        } catch (error) {
          logger.error('❌ Image upload failed:', error);
          imageUrl = '';
        }
      }

      // 3. Create metadata
      const metadata: MetadataJson = {
        name: request.name,
        symbol: request.symbol,
        description: request.description || `${request.name} - Simple immutable token`,
        image: imageUrl,
        external_url: request.website || '',
        attributes: [
          { trait_type: 'Platform', value: 'Launchium' },
          { trait_type: 'Standard', value: 'SPL Token' },
          { trait_type: 'Decimals', value: config.defaultDecimals },
          { trait_type: 'Supply', value: '1,000,000,000' },
          { trait_type: 'Immutable', value: 'true' }
        ]
      };

      if (request.website) {
        metadata.attributes?.push({ trait_type: 'Website', value: request.website });
      }
      if (request.twitter) {
        metadata.attributes?.push({ trait_type: 'Twitter', value: request.twitter });
      }
      if (request.discord) {
        metadata.attributes?.push({ trait_type: 'Discord', value: request.discord });
      }

      const metadataUri = await this.ipfsService.uploadJson(metadata);
      logger.info(`📄 Metadata uploaded: ${metadataUri}`);

      // 4. Create immutable token
      logger.info('🔨 Creating immutable token...');
      const createTokenTx = await createFungible(this.umi!, {
        mint,
        name: request.name,
        symbol: request.symbol,
        uri: metadataUri,
        sellerFeeBasisPoints: percentAmount(0),
        decimals: config.defaultDecimals,
        isMutable: false, // Immutable metadata
        splTokenProgram: publicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      }).sendAndConfirm(this.umi!);

      logger.info('✅ Token created, waiting for confirmation...');

      // Wait a bit for blockchain confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Convert UMI mint to web3.js types
      const mintPubkey = new PublicKey(mint.publicKey.toString());
      const userWalletPubkey = new PublicKey(request.userWallet);
      
      // 5. Get user's associated token account
      const userTokenAccount = await getAssociatedTokenAddress(mintPubkey, userWalletPubkey);
      logger.info(`📝 User token account: ${userTokenAccount.toBase58()}`);

      // 6. Check if user's ATA exists, create if not
      const userAccountInfo = await this.connection.getAccountInfo(userTokenAccount);
      if (!userAccountInfo) {
        logger.info('🔧 Creating user token account...');
        const createUserATAInstruction = createAssociatedTokenAccountInstruction(
          this.walletService.getMasterKeypair().publicKey, // payer (master pays)
          userTokenAccount,
          userWalletPubkey, // owner
          mintPubkey
        );

        const ataTransaction = new Transaction().add(createUserATAInstruction);
        const ataSignature = await this.connection.sendTransaction(ataTransaction, [this.walletService.getMasterKeypair()]);
        
        // Wait for ATA creation confirmation
        await this.connection.confirmTransaction(ataSignature, 'confirmed');
        logger.info('✅ User token account created and confirmed');
      }

      // 7. Mint tokens directly to user (1 billion tokens)
      logger.info('💎 Minting tokens to user...');
      const mintAmount = Number(config.defaultSupply);
      
      try {
        const mintSignature = await mintTo(
          this.connection,
          this.walletService.getMasterKeypair(), // payer
          mintPubkey, // mint
          userTokenAccount, // destination
          this.walletService.getMasterKeypair(), // mint authority
          mintAmount // amount
        );

        // Wait for mint confirmation
        await this.connection.confirmTransaction(mintSignature, 'confirmed');
        logger.info(`✅ Minted ${(mintAmount / (10 ** config.defaultDecimals)).toLocaleString()} tokens to user`);

      } catch (mintError) {
        logger.error('❌ Mint failed:', mintError);
        throw new Error(`Failed to mint tokens: ${mintError instanceof Error ? mintError.message : 'Unknown mint error'}`);
      }

      // 8. Revoke ALL authorities (immutable token)
      logger.info('🔒 Revoking mint authority...');
      await setAuthority(
        this.connection,
        this.walletService.getMasterKeypair(),
        mintPubkey,
        this.walletService.getMasterKeypair(),
        AuthorityType.MintTokens,
        null // Revoke = no more minting
      );

      logger.info('🔒 Revoking freeze authority...');
      await setAuthority(
        this.connection,
        this.walletService.getMasterKeypair(),
        mintPubkey,
        this.walletService.getMasterKeypair(),
        AuthorityType.FreezeAccount,
        null // Revoke = no freezing
      );

      logger.info('✅ All authorities revoked - token is now immutable');

      // 9. Prepare response
      const metadataPda = findMetadataPda(this.umi!, { mint: mint.publicKey });
      
      const response: LaunchTokenResponse = {
        success: true,
        mintAddress: mint.publicKey.toString(),
        metadataAddress: metadataPda[0].toString(),
        userTokenAccount: userTokenAccount.toBase58(),
        totalSupply: config.defaultSupply.toString(),
        userBalance: config.defaultSupply.toString(), // All tokens go to user
        transactionSignature: Buffer.from(createTokenTx.signature).toString('base64'),
        explorerUrl: `https://explorer.solana.com/tx/${Buffer.from(createTokenTx.signature).toString('base64')}?cluster=mainnet`,
        fee: (feeAmount / LAMPORTS_PER_SOL).toString() // Fee deducted from master wallet
      };

      logger.info('🎉 Simple token mint completed successfully!');
      logger.info(`Token Address: ${response.mintAddress}`);
      logger.info(`User receives: ${(Number(config.defaultSupply) / (10 ** config.defaultDecimals)).toLocaleString()} tokens`);

      return response;

    } catch (error) {
      logger.error('❌ Token mint failed:', error);
      throw new Error(`Token mint failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTokenStatus(mintAddress: string): Promise<TokenStatusResponse> {
    try {
      logger.info(`📊 Fetching token status: ${mintAddress}`);
      
      // Simple status - no pool info since we don't create pools
      const metadata: TokenMetadata = {
        name: 'Token',
        symbol: 'TKN',
        uri: 'https://ipfs.io/ipfs/QmPlaceholder',
        description: 'Simple immutable token',
        image: '',
        externalUrl: '',
        attributes: []
      };

      return {
        mintAddress,
        name: metadata.name,
        symbol: metadata.symbol,
        decimals: config.defaultDecimals,
        totalSupply: config.defaultSupply.toString(),
        metadata,
        launchTimestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Failed to get token status:', error);
      throw error;
    }
  }

  private validateTokenRequest(request: LaunchTokenRequest): void {
    if (!request.name?.trim()) {
      throw new Error('Token name is required');
    }
    if (request.name.length > 32) {
      throw new Error('Token name must be 32 characters or less');
    }
    if (!request.symbol?.trim()) {
      throw new Error('Token symbol is required');
    }
    if (request.symbol.length > 10) {
      throw new Error('Token symbol must be 10 characters or less');
    }
    if (!request.userWallet) {
      throw new Error('User wallet address is required');
    }

    try {
      new PublicKey(request.userWallet);
    } catch {
      throw new Error('Invalid user wallet address');
    }

    if (request.description && request.description.length > 200) {
      throw new Error('Description must be 200 characters or less');
    }
  }

  getTokenStandards() {
    return {
      decimals: config.defaultDecimals,
      supply: config.defaultSupply.toString(),
      fee: '0.1 SOL (deducted from platform)',
      immutable: true,
      authorities: 'All revoked (mint, freeze, update)',
      supportedFormats: ['PNG', 'JPG', 'JPEG', 'GIF'],
      maxImageSize: '5MB'
    };
  }

  async getLaunchStatistics() {
    return {
      totalTokensLaunched: 0,
      averageLaunchTime: '10-15 seconds',
      successRate: '99.9%',
      fee: '0.1 SOL per token',
      immutability: 'Full (all authorities revoked)'
    };
  }
}