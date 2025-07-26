import Head from 'next/head'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Transaction } from '@solana/web3.js'
import axios from 'axios'

// Types
interface LaunchTokenRequest {
  userWallet: string
  name: string
  symbol: string
  description: string
  imageUrl?: string
  imageUpload?: string
  website?: string
  twitter?: string
  telegram?: string
}

interface PrepareTokenResponse {
  success: boolean
  sessionId: string
  mintAddress: string
  transaction: string
  message: string
}

interface LaunchTokenResponse {
  success: boolean
  mintAddress: string
  userTokenAccount: string
  userBalance: string
  fee: string
  explorerUrl: string
  message?: string
}

export default function Home() {
  const { publicKey, connected, signTransaction } = useWallet()
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    website: '',
    twitter: '',
    telegram: ''
  })
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'signing' | 'executing' | 'completed'>('form')
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
        telegram: ''
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
    
    if (!connected || !publicKey || !signTransaction) {
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
    setStep('form')

    try {
      // STEP 1: Prepare image
      let imageUpload = ''
      
      if (imageFile) {
        console.log('📤 Preparing image...')
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
        console.log('✅ Image prepared')
        setUploadProgress(40)
      }

      // STEP 2: Prepare transaction
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

      if (formData.telegram.trim()) {
        requestData.telegram = formData.telegram.trim()
      }

      setUploadProgress(60)
      console.log('🚀 Preparing token transaction:', requestData)

      const prepareResponse = await axios.post<PrepareTokenResponse>(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/token/prepare`,
        requestData,
        {
          timeout: 120000,
        }
      )
      
      if (!prepareResponse.data.success) {
        throw new Error('Failed to prepare transaction')
      }

      setUploadProgress(80)
      setStep('signing')

      // STEP 3: User signs transaction
      console.log('📝 Requesting user signature...')
      
      const transaction = Transaction.from(Buffer.from(prepareResponse.data.transaction, 'base64'))
      const signedTransaction = await signTransaction(transaction)
      
      console.log('✅ Transaction signed by user')
      setStep('executing')

      // STEP 4: Execute signed transaction
      console.log('⚡ Executing token creation...')
      
      const executeResponse = await axios.post<LaunchTokenResponse>(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/token/execute`,
        {
          sessionId: prepareResponse.data.sessionId,
          signedTransaction: signedTransaction.serialize().toString('base64')
        },
        {
          timeout: 120000,
        }
      )
      
      setUploadProgress(100)
      setResult(executeResponse.data)
      setStep('completed')
      
      // Clear form on success
      setFormData({
        name: '',
        symbol: '',
        description: '',
        website: '',
        twitter: '',
        telegram: ''
      })
      setImageFile(null)
      setImagePreview(null)
      
      console.log('🎉 Token created successfully!')

    } catch (error: any) {
      console.error('❌ Token creation failed:', error)
      
      let errorMessage = 'Failed to create token'
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      }

      // Handle specific wallet errors
      if (error.message?.includes('User rejected')) {
        errorMessage = 'Transaction was rejected by user'
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient SOL for transaction fees'
      }

      setError(errorMessage)
      setStep('form')
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Launchium - Create Your Token in Seconds</title>
        <meta name="description" content="Launch immutable SPL tokens on Solana in 0-60 seconds. No code required." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Image src="/logo.png" alt="Launchium" width={32} height={32} className="h-8 w-8" />
                <span className="text-2xl font-bold gradient-text">Launchium</span>
              </div>
              <WalletMultiButton className="!rounded-lg !px-6 !py-3" />
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6">
          {/* Hero Section */}
          <div className="text-center py-20">
            <h1 className="text-6xl font-bold mb-6 text-gray-900">
              Launch a token
              <br />
              <span className="gradient-text">
                in seconds
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Revolutionary platform that transforms ideas into tradeable tokens instantly.
              No code required.
            </p>
            
            <div className="flex justify-center space-x-8 text-sm text-gray-500 mb-12">
              <div className="flex items-center">
                <div className="w-2 h-2 gradient-primary rounded-full mr-2"></div>
                0-60 second launch
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 gradient-primary rounded-full mr-2"></div>
                Fully immutable
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 gradient-primary rounded-full mr-2"></div>
                No code required
              </div>
            </div>

          </div>

          {/* Token Creation Form - Always Visible */}
          <div className="max-w-2xl mx-auto pb-20">
            <div className="card-light rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-8 gradient-text">Create Token</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Token Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g. My Token"
                        maxLength={32}
                        className="w-full px-4 py-3 input-light"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Token Symbol *</label>
                      <input
                        type="text"
                        name="symbol"
                        value={formData.symbol}
                        onChange={handleInputChange}
                        placeholder="e.g. TKN"
                        maxLength={10}
                        className="w-full px-4 py-3 input-light"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Description *</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Describe your token..."
                      maxLength={200}
                      rows={4}
                      className="w-full px-4 py-3 input-light"
                      required
                    />
                    <div className="text-right text-xs text-gray-500 mt-1">
                      {formData.description.length}/200
                    </div>
                  </div>

                  {/* Optional Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Website</label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        placeholder="https://..."
                        className="w-full px-4 py-3 input-light"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Twitter</label>
                      <input
                        type="url"
                        name="twitter"
                        value={formData.twitter}
                        onChange={handleInputChange}
                        placeholder="https://twitter.com/..."
                        className="w-full px-4 py-3 input-light"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Telegram</label>
                      <input
                        type="url"
                        name="telegram"
                        value={formData.telegram}
                        onChange={handleInputChange}
                        placeholder="https://t.me/..."
                        className="w-full px-4 py-3 input-light"
                      />
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
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
                          className="w-full h-32 upload-area flex flex-col items-center justify-center cursor-pointer"
                        >
                          <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-gray-600 font-medium">Upload Logo</span>
                          <span className="text-gray-500 text-sm">PNG, JPG or JPEG</span>
                        </label>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="w-full h-32 rounded-lg border-2 border-gray-200 bg-gray-50 flex items-center justify-center">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
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
                  {loading && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>
                          {step === 'form' && 'Preparing...'}
                          {step === 'signing' && 'Waiting for signature...'}
                          {step === 'executing' && 'Creating token...'}
                          {step === 'completed' && 'Completed!'}
                        </span>
                        {uploadProgress > 0 && (
                          <span>{uploadProgress}%</span>
                        )}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="gradient-primary h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: step === 'signing' ? '90%' : 
                                   step === 'executing' ? '95%' : 
                                   step === 'completed' ? '100%' : 
                                   `${uploadProgress}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Launch Button */}
                  <button
                    type="submit"
                    disabled={loading || !connected}
                    className="w-full py-4 btn-gradient text-white font-semibold text-lg rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {step === 'form' && !loading && 'Create Token'}
                    {step === 'form' && loading && 'Preparing...'}
                    {step === 'signing' && 'Please Sign Transaction'}
                    {step === 'executing' && 'Creating Token...'}
                    {step === 'completed' && 'Token Created!'}
                  </button>
                </form>


              </div>

              {/* Error */}
              {error && (
                <div className="mt-6 p-4 status-error rounded-lg">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {/* Success Result */}
              {result && (
                <div className="mt-6 p-6 status-success rounded-lg">
                  <h3 className="text-green-800 font-semibold text-xl mb-4">Token Created Successfully!</h3>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Token Address:</span>
                      <span className="font-mono text-green-800 break-all">{result.mintAddress}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-700">Your Balance:</span>
                      <span className="text-green-800">{(Number(result.userBalance) / 1e9).toLocaleString('en-US')} tokens</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-700">Platform Fee:</span>
                      <span className="text-green-800">{result.fee} SOL</span>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <a
                      href={`https://solana.fm/address/${result.mintAddress}?cluster=mainnet-beta`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 btn-gradient text-white rounded-lg text-sm"
                    >
                      View Token
                    </a>
                    
                    <a
                      href={`https://solana.fm/address/${result.userTokenAccount}?cluster=mainnet-beta`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                    >
                      View Balance
                    </a>
                    
                    <a
                      href={result.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                    >
                      View Transaction
                    </a>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>
    </>
  )
} 