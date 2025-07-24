# Launchium Frontend

Revolutionary token creation platform built with Next.js and Solana.

## Features

- **Simple Token Creation**: Launch tokens in seconds
- **Immutable Tokens**: No mint/freeze/update authority 
- **Wallet Integration**: Phantom & Solflare support
- **IPFS Metadata**: Permanent token metadata storage
- **Security First**: Input sanitization and XSS protection

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Environment Variables

Create a `.env.local` file:

```bash
# Backend API endpoint
NEXT_PUBLIC_API_URL=http://localhost:3000

# Solana RPC (use your own endpoint)
NEXT_PUBLIC_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY

# Environment
NEXT_PUBLIC_ENVIRONMENT=production
```

## Deployment

### Vercel (Recommended)

1. Fork/clone this repository
2. Connect to Vercel
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL`: Your backend URL
   - `NEXT_PUBLIC_RPC_URL`: Your Solana RPC endpoint
   - `NEXT_PUBLIC_ENVIRONMENT`: `production`

### Manual Deploy

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Security Features

- **Input Sanitization**: XSS prevention
- **Form Validation**: Client & server-side validation
- **File Upload Security**: Type and size validation
- **Memory Cleanup**: Sensitive data cleared on unmount
- **Security Headers**: XSS, CSRF, and clickjacking protection

## Tech Stack

- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **Wallet**: Solana Wallet Adapter
- **Blockchain**: Solana Web3.js
- **TypeScript**: Full type safety

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details. 