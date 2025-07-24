import React, { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import axios from 'axios'
import Head from 'next/head'
import dynamic from 'next/dynamic'

// Dynamic import with no SSR to prevent hydration issues
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
)

interface LaunchTokenRequest {
  userWallet: string
  name: string
  symbol: string
  description: string
  imageUrl?: string
  imageUpload?: string
  website?: string
  twitter?: string
  discord?: string
}

interface LaunchTokenResponse {
  success: boolean
  mintAddress: string
  metadataAddress: string
  userTokenAccount: string
  totalSupply: string
  userBalance: string
  transactionSignature: string
  explorerUrl: string
  fee: string
}

export default function Home() {
  const { publicKey, connected } = useWallet()
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    website: '',
    twitter: '',
    discord: ''
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LaunchTokenResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  // Security: Clear sensitive data on unmount
  useEffect(() => {
    return () => {
      setFormData({
        name: '',
        symbol: '',
        description: '',
        website: '',
        twitter: '',
        discord: ''
      })
      setResult(null)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // Security: Input sanitization
    const sanitizedValue = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    
    setFormData(prev => ({ ...prev, [name]: sanitizedValue }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Security: Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (PNG, JPG, JPEG, GIF)')
      return
    }

    // Security: Validate file size (4MB max)
    const maxSize = 4 * 1024 * 1024
    if (file.size > maxSize) {
      setError('Image size must be less than 4MB')
      return
    }

    setImageFile(file)
    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setUploadProgress(0)
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Token name is required')
      return false
    }
    if (formData.name.length > 32) {
      setError('Token name must be 32 characters or less')
      return false
    }
    if (!formData.symbol.trim()) {
      setError('Token symbol is required')
      return false
    }
    if (formData.symbol.length > 10) {
      setError('Token symbol must be 10 characters or less')
      return false
    }
    if (!formData.description.trim()) {
      setError('Description is required')
      return false
    }
    if (formData.description.length > 200) {
      setError('Description must be 200 characters or less')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!connected || !publicKey) {
      setError('Please connect your wallet')
      return
    }

    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setUploadProgress(0)

    try {
      let imageUpload = ''
      
      // Convert image to base64 if file is selected
      if (imageFile) {
        setUploadProgress(20)
        
        const reader = new FileReader()
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1]
            resolve(base64)
          }
        })
        
        reader.readAsDataURL(imageFile)
        imageUpload = await base64Promise
        setUploadProgress(50)
      }

      // Prepare token launch request
      const requestData: LaunchTokenRequest = {
        userWallet: publicKey.toString(),
        name: formData.name.trim(),
        symbol: formData.symbol.trim().toUpperCase(),
        description: formData.description.trim()
      }

      if (imageUpload) {
        requestData.imageUpload = imageUpload
      }

      if (formData.website.trim()) {
        requestData.website = formData.website.trim()
      }

      if (formData.twitter.trim()) {
        requestData.twitter = formData.twitter.trim()
      }

      if (formData.discord.trim()) {
        requestData.discord = formData.discord.trim()
      }

      setUploadProgress(80)

      const response = await axios.post<LaunchTokenResponse>(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/token/launch`,
        requestData,
        {
          timeout: 60000, // 60 second timeout
        }
      )
      
      setUploadProgress(100)
      setResult(response.data)
      
      // Clear form after success
      setFormData({
        name: '',
        symbol: '',
        description: '',
        website: '',
        twitter: '',
        discord: ''
      })
      setImageFile(null)
      setImagePreview(null)
      
    } catch (err: any) {
      let errorMessage = 'Token creation failed'
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Don't render wallet-dependent content until mounted
  if (!mounted) {
    return (
      <>
        <Head>
          <title>Launchium - Token Creator</title>
          <meta name="description" content="Launch your token in seconds with Launchium" />
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        </Head>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Launchium - Token Creator</title>
        <meta name="description" content="Launch your token in seconds with Launchium" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>

      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <header className="border-b border-gray-800">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img src="/logo.png" alt="Launchium" className="w-8 h-8" />
                <span className="text-xl font-bold">Launchium</span>
              </div>
              <WalletMultiButton className="!bg-gradient-to-r !from-blue-500 !to-purple-600 hover:!from-blue-600 hover:!to-purple-700 !rounded-lg" />
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6">
          {/* Hero Section */}
          <div className="text-center py-20">
            <h1 className="text-6xl font-bold mb-6">
              Launch a token
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                in seconds
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Revolutionary platform that transforms ideas into tradeable tokens instantly.
              No code required.
            </p>
            
            <div className="flex justify-center space-x-8 text-sm text-gray-400 mb-12">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full mr-2"></div>
                0-60 second launch
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full mr-2"></div>
                Fully immutable
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full mr-2"></div>
                No code required
              </div>
            </div>

            {!connected && (
              <div className="max-w-md mx-auto">
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700 shadow-2xl backdrop-blur-sm">
                  <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
                  <p className="text-gray-300 mb-6">
                    Connect your wallet to start creating tokens
                  </p>
                  <WalletMultiButton className="!bg-gradient-to-r !from-blue-500 !to-purple-600 hover:!from-blue-600 hover:!to-purple-700 !w-full !rounded-lg !py-3" />
                </div>
              </div>
            )}
          </div>

          {connected && (
            <div className="max-w-2xl mx-auto pb-20">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700 shadow-2xl backdrop-blur-sm">
                <h2 className="text-2xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Create Token</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-200">Token Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g. My Token"
                        maxLength={32}
                        className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-200">Token Symbol *</label>
                      <input
                        type="text"
                        name="symbol"
                        value={formData.symbol}
                        onChange={handleInputChange}
                        placeholder="e.g. TKN"
                        maxLength={10}
                        className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-200">Description *</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Describe your token..."
                      maxLength={200}
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                    <div className="text-right text-xs text-gray-400 mt-1">
                      {formData.description.length}/200
                    </div>
                  </div>

                  {/* Optional Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-200">Website</label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        placeholder="https://..."
                        className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-200">Twitter</label>
                      <input
                        type="url"
                        name="twitter"
                        value={formData.twitter}
                        onChange={handleInputChange}
                        placeholder="https://twitter.com/..."
                        className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-200">Discord</label>
                      <input
                        type="url"
                        name="discord"
                        value={formData.discord}
                        onChange={handleInputChange}
                        placeholder="https://discord.gg/..."
                        className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-200">
                      Token Logo (PNG/JPG, Max 4MB)
                    </label>
                    
                    {!imagePreview ? (
                      <div className="relative">
                        <input
                          type="file"
                          id="image-upload"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="image-upload"
                          className="w-full h-32 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-500/5 transition-all duration-300"
                        >
                          <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-gray-300 font-medium">Upload Logo</span>
                          <span className="text-gray-400 text-sm">PNG, JPG or JPEG</span>
                        </label>
                      </div>
                    ) : (
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-full h-32 object-cover rounded-lg border border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {loading && uploadProgress > 0 && (
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}

                  {/* Launch Button */}
                  <button
                    type="submit"
                    disabled={loading || !connected}
                    className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold text-lg rounded-lg transition-all duration-300 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    {loading ? 'Creating Token...' : 'Create Token (0.1 SOL)'}
                  </button>
                </form>

                {/* Token Features */}
                <div className="mt-8 p-4 bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-lg border border-blue-500/20">
                  <h3 className="font-semibold mb-2 text-blue-300">Token Features</h3>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Supply: 1,000,000,000 tokens (all to you)</li>
                    <li>• Fee: 0.1 SOL (deducted from platform)</li>
                    <li>• Immutable: No mint/freeze/update authority</li>
                    <li>• Standard: SPL Token with Metaplex metadata</li>
                  </ul>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mt-6 p-4 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/50 rounded-lg backdrop-blur-sm">
                  <p className="text-red-200">{error}</p>
                </div>
              )}

              {/* Success Result */}
              {result && (
                <div className="mt-6 p-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-lg backdrop-blur-sm">
                  <h3 className="text-green-200 font-semibold text-xl mb-4">Token Created Successfully!</h3>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Token Address:</span>
                      <span className="font-mono text-green-200 break-all">{result.mintAddress}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-300">Your Balance:</span>
                      <span className="text-green-200">{(Number(result.userBalance) / 1e9).toLocaleString('en-US')} tokens</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-300">Platform Fee:</span>
                      <span className="text-green-200">{result.fee} SOL</span>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <a
                      href={`https://solscan.io/token/${result.mintAddress}?cluster=mainnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg text-sm transition-colors"
                    >
                      View Token
                    </a>
                    
                    <a
                      href={`https://solscan.io/account/${result.userTokenAccount}?cluster=mainnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg text-sm transition-colors"
                    >
                      View Balance
                    </a>
                    
                    <a
                      href={result.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg text-sm transition-colors"
                    >
                      View Transaction
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
} 