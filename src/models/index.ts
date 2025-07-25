export interface CreateWalletResponse {
  walletAddress: string;
  privateKey: string; // Base58 encoded
  message: string;
}

export interface LaunchTokenRequest {
  userWallet: string;
  name: string;
  symbol: string;
  description?: string;
  imageUpload?: string; // base64 string
  imageUrl?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
}

export interface PrepareTokenRequest {
  userWallet: string;
  name: string;
  symbol: string;
  description?: string;
  imageUpload?: string; // base64 string
  imageUrl?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
}

export interface PrepareTokenResponse {
  success: boolean;
  sessionId: string;
  mintAddress: string;
  transaction: string; // base64 encoded transaction
  message: string;
}

export interface ExecuteTokenRequest {
  sessionId: string;
  signedTransaction: string; // base64 encoded signed transaction
}

export interface LaunchTokenResponse {
  success: boolean;
  mintAddress: string;
  metadataAddress: string;
  userTokenAccount: string;
  totalSupply: string;
  userBalance: string;
  transactionSignature: string;
  explorerUrl: string;
  fee: string;
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