# Launchium - Simple Token Creator

Revolutionary platform that transforms ideas into tradeable tokens instantly. Create immutable SPL tokens on Solana in seconds with no code required.

## Features

- **Simple Token Creation**: Launch tokens in 0-60 seconds
- **Fully Immutable**: All authorities revoked (mint, freeze, update)
- **No Pools**: Direct token transfer to user wallet
- **0.1 SOL Fee**: Deducted from platform wallet
- **1B Token Supply**: All tokens go to creator
- **IPFS Metadata**: Permanent storage for token info
- **Wallet Integration**: Phantom & Solflare support

## Architecture

### Backend (Port 3000)
- **Framework**: Node.js + TypeScript + Express
- **Blockchain**: Solana Web3.js + Metaplex
- **Token Standard**: SPL Token with Token-2022 support
- **Metadata**: IPFS via dedicated service

### Frontend (Port 3001)
- **Framework**: Next.js 14 + TypeScript
- **Styling**: Tailwind CSS (Launchium.app inspired)
- **Wallet**: Solana Wallet Adapter
- **Security**: XSS protection, input sanitization

## Quick Start

```bash
# Clone repository
git clone <repo-url>
cd beta-kopyasi

# Backend setup
npm install
cp .env.example .env
# Configure .env with your settings
npm run dev

# Frontend setup (new terminal)
cd frontend
npm install
cp .env.example .env.local
# Configure frontend environment
npm run dev
```

Access:
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000

## Environment Configuration

### Backend (.env)
```bash
RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
MASTER_WALLET_SECRET=your_master_wallet_private_key
PLATFORM_REWARD_ADDRESS=your_platform_wallet_address
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_ENVIRONMENT=production
```

## Deployment

### Frontend (Vercel)
1. Push to GitHub
2. Connect to Vercel
3. Set environment variables
4. Deploy automatically

### Backend (Railway/Render)
1. Configure production environment
2. Set required environment variables
3. Deploy with npm start

## API Endpoints

```bash
POST /api/token/launch        # Create new token
GET  /api/token/status/:mint  # Get token status
GET  /api/token/standards     # Get token standards
GET  /api/token/stats         # Get platform stats
```

## Security Features

- **Input Sanitization**: XSS prevention
- **File Upload Validation**: Type & size checks
- **Private Key Security**: Secure storage
- **HTTPS Only**: Production security
- **Rate Limiting**: API protection
- **Memory Cleanup**: Sensitive data cleared

## Token Creation Process

1. **User Input**: Name, symbol, description, logo
2. **Fee Collection**: 0.1 SOL from platform wallet
3. **Token Creation**: Immutable SPL token
4. **Metadata Upload**: IPFS storage
5. **Token Mint**: 1B tokens to user wallet
6. **Authority Revoke**: Make token immutable
7. **Response**: Token address & transaction

## File Structure

```
beta-kopyasi/
├── src/                    # Backend source
│   ├── api/               # API routes
│   ├── services/          # Business logic
│   ├── models/            # Type definitions
│   ├── config/            # Configuration
│   └── utils/             # Utilities
├── frontend/              # Next.js frontend
│   ├── pages/             # Pages
│   ├── styles/            # CSS styles
│   ├── public/            # Static assets
│   └── vercel.json        # Vercel config
├── .env                   # Backend environment
└── README.md              # This file
```

## Technologies

- **Blockchain**: Solana, SPL Token, Metaplex
- **Backend**: Node.js, TypeScript, Express
- **Frontend**: Next.js, React, Tailwind CSS
- **Storage**: IPFS (metadata & images)
- **Security**: Input validation, XSS protection

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## License

MIT License - see LICENSE file for details.

---

**Built for the Solana ecosystem** 🚀 