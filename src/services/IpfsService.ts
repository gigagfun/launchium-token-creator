import { createLogger } from '../utils/logger';
import { config } from '../config/index';
import FormData from 'form-data';

const logger = createLogger('IpfsService');

export interface IpfsUploadResponse {
  ipfsHash: string;
  pinSize: number;
  timestamp: string;
  isDuplicate?: boolean;
}

export interface MetadataJson {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties?: {
    category: string;
    creators?: Array<{
      address: string;
      share: number;
    }>;
  };
}

export class IpfsService {
  private pinataJwt: string;
  private jsonApiUrl: string;
  private fileApiUrl: string;

  constructor() {
    this.pinataJwt = config.pinataJwt;
    this.jsonApiUrl = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
    this.fileApiUrl = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
  }

  async uploadJson(metadata: MetadataJson): Promise<string> {
    try {
      logger.info('Uploading JSON metadata to Pinata IPFS');

      if (!this.pinataJwt) {
        logger.warn('Pinata not configured, using data URI');
        return this.createDataUri(metadata);
      }

      const response = await fetch(this.jsonApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.pinataJwt}`,
        },
        body: JSON.stringify({
          pinataContent: metadata,
          pinataMetadata: {
            name: `${metadata.symbol}_metadata.json`,
            keyvalues: {
              tokenSymbol: metadata.symbol,
              tokenName: metadata.name,
              uploadType: 'metadata'
            }
          },
          pinataOptions: {
            cidVersion: 0
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Pinata upload failed: ${response.statusText}`);
      }

      const result = await response.json() as {
        IpfsHash: string;
        PinSize: number;
        Timestamp: string;
        isDuplicate?: boolean;
      };

      // Use gateway.pinata.cloud for better reliability with Solscan
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
      
      logger.info(`✅ Metadata uploaded to IPFS: ${ipfsUrl}`);
      return ipfsUrl;

    } catch (error) {
      logger.error('❌ Failed to upload metadata to IPFS:', error);
      logger.info('Falling back to data URI');
      return this.createDataUri(metadata);
    }
  }

  async uploadImage(imageBuffer: Buffer, fileName: string): Promise<string> {
    try {
      logger.info(`Uploading image ${fileName} to Pinata IPFS`);

      if (!this.pinataJwt) {
        logger.warn('Pinata not configured, using data URI');
        const base64Image = imageBuffer.toString('base64');
        return `data:image/png;base64,${base64Image}`;
      }

      // Create FormData with form-data package
      const formData = new FormData();
      
      // Add the image buffer directly
      formData.append('file', imageBuffer, {
        filename: fileName,
        contentType: 'image/png'
      });
      
      // Add metadata
      formData.append('pinataMetadata', JSON.stringify({
        name: fileName,
        keyvalues: {
          uploadType: 'image',
          fileName: fileName
        }
      }));

      formData.append('pinataOptions', JSON.stringify({
        cidVersion: 0
      }));

      const response = await fetch(this.fileApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.pinataJwt}`,
          ...formData.getHeaders()
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pinata image upload failed: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json() as {
        IpfsHash: string;
        PinSize: number;
        Timestamp: string;
        isDuplicate?: boolean;
      };

      // Use gateway.pinata.cloud for better reliability with Solscan
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
      
      logger.info(`✅ Image uploaded to IPFS: ${ipfsUrl}`);
      return ipfsUrl;

    } catch (error) {
      logger.error('❌ Failed to upload image to IPFS:', error);
      if (error instanceof Error) {
        logger.error('Error details:', error.message);
        logger.error('Error stack:', error.stack);
      }
      logger.info('Falling back to data URI');
      const base64Image = imageBuffer.toString('base64');
      return `data:image/png;base64,${base64Image}`;
    }
  }

  private createDataUri(metadata: MetadataJson): string {
    // Create minimal metadata to avoid transaction size limits
    const minimalMetadata = {
      name: metadata.name,
      symbol: metadata.symbol,
      description: metadata.description
    };
    const jsonString = JSON.stringify(minimalMetadata);
    const encoded = encodeURIComponent(jsonString);
    return `data:application/json,${encoded}`;
  }

  isValidIpfsHash(hash: string): boolean {
    const ipfsHashRegex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
    return ipfsHashRegex.test(hash);
  }

  extractHashFromUrl(url: string): string | null {
    const match = url.match(/\/(ipfs)\/([Qm][1-9A-HJ-NP-Za-km-z]{44})/);
    return match ? match[2] : null;
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.pinataJwt) {
        logger.warn('Pinata JWT not configured');
        return false;
      }

      const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.pinataJwt}`,
        },
      });

      if (response.ok) {
        logger.info('✅ Pinata connection test successful');
        return true;
      } else {
        logger.error('❌ Pinata connection test failed:', response.statusText);
        return false;
      }
    } catch (error) {
      logger.error('❌ Pinata connection test error:', error);
      return false;
    }
  }
} 