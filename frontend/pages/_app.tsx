import type { AppProps } from 'next/app'
import { useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
// Standard Wallet adapters removed as per console warnings
// import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'

import '@solana/wallet-adapter-react-ui/styles.css'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  // Use mainnet for production, devnet for development
  const network = process.env.NODE_ENV === 'production' 
    ? WalletAdapterNetwork.Mainnet 
    : WalletAdapterNetwork.Mainnet // Always use mainnet for this project

  // RPC endpoint - use environment variable for production
  const endpoint = useMemo(() => {
    if (process.env.NEXT_PUBLIC_RPC_URL) {
      return process.env.NEXT_PUBLIC_RPC_URL
    }
    return clusterApiUrl(network)
  }, [network])

  // Standard Wallet adapters auto-detected, no manual adapters needed
  const wallets = useMemo(() => [], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Component {...pageProps} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
} 