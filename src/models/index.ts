export interface CreateWalletResponse {
  walletAddress: string;
  privateKey: string; // Base58 encoded
  message: string;
}

export interface LaunchTokenRequest {
  userWallet: string; // Receives tokens after mint (with fee deducted from master wallet)
  name: string;
  symbol: string;
  description: string;
  imageUrl?: string; // Can be IPFS CID or URL
  imageUpload?: string; // Base64 encoded image for upload
  website?: string;
  twitter?: string;
  discord?: string;
}

export interface LaunchTokenResponse {
  success: boolean;
  mintAddress: string;
  metadataAddress: string;
  userTokenAccount: string;
  totalSupply: string;
  userBalance: string; // Tokens sent to user
  transactionSignature: string;
  explorerUrl: string;
  fee: string; // Fee deducted from master wallet (in SOL)
}

export interface TokenStatusResponse {
  mintAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  metadata: TokenMetadata;
  launchTimestamp: number;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  uri: string; // Points to off-chain JSON
  description?: string;
  image?: string;
  externalUrl?: string;
  attributes: MetadataAttribute[];
}

export interface MetadataAttribute {
  traitType: string;
  value: string;
}

export interface ErrorResponse {
  error: string;
  code: string;
  details?: string;
}

export interface TokenLaunchData {
  mintKeypair: any; // Keypair type
  metadataPda: string;
  userTokenAccount: string;
  metadataUri: string;
} 