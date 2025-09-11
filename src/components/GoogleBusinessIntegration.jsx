import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { supabase } from '../lib/supabase'
import { 
  Loader2, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Globe,
  Unplug,
  Settings as SettingsIcon,
  XCircle
} from 'lucide-react'

const GoogleBusinessIntegration = () => {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [businesses, setBusinesses] = useState([])
  const [selectedBusiness, setSelectedBusiness] = useState(null)

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('google_access_token, google_token_expires_at, last_google_sync_at, company_name, google_business_id')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const showToast = (title, description, variant = 'default') => {
    // Simple toast implementation - you can replace with your preferred toast library
    console.log(`${variant.toUpperCase()}: ${title} - ${description}`)
    alert(`${title}: ${description}`)
  }

  const initiateGoogleOAuth = async () => {
    try {
      setIsConnecting(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Generate OAuth URL client-side (since backend functions expect different parameters)
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com'
      const redirectUri = `${window.location.origin}/oauth-callback.html`
      
      // Updated scopes - removed deprecated plus.business.manage
      const scopes = [
        'https://www.googleapis.com/auth/business.manage',
        'openid',
        'email',
        'profile'
      ].join(' ')

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scopes,
        access_type: 'offline',
        prompt: 'consent',
        state: user.id, // Pass user ID as state for callback
        include_granted_scopes: 'true' // Include previously granted scopes
      })

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
      
      console.log('OAuth Debug Info:')
      console.log('- Client ID:', clientId)
      console.log('- Redirect URI:', redirectUri)
      console.log('- Scopes:', scopes)
      console.log('- User ID (state):', user.id)
      console.log('- Full OAuth URL:', authUrl)
      
      console.log('Opening OAuth URL:', authUrl)
      
      // Open OAuth popup window
      const popup = window.open(
        authUrl,
        'google_oauth',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      )

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        throw new Error('Popup blocked! Please allow popups for this site and try again.')
      }

      // Set up message listener for the OAuth callback
      const handleMessage = (event) => {
        console.log('OAuth parent: Received message:', event.data)
        
        if (event.data?.type === 'GOOGLE_OAUTH_SUCCESS') {
          console.log('OAuth parent: Success callback received, cleaning up')
          window.removeEventListener('message', handleMessage)
          
          // Close the popup
          try { if (popup && !popup.closed) popup.close() } catch {}
          
          showToast("Success", "Google Business Profile connected successfully!")
          // Refresh profile data after OAuth completion
          setTimeout(fetchProfile, 1000)
          // Fetch business listings
          setTimeout(fetchBusinessListings, 2000)
          setIsConnecting(false)
        } else if (event.data?.type === 'GOOGLE_OAUTH_ERROR') {
          console.log('OAuth parent: Error callback received:', event.data)
          window.removeEventListener('message', handleMessage)
          
          // Close the popup
          try { if (popup && !popup.closed) popup.close() } catch {}
          
          const errorMsg = event.data.error_description || event.data.error || 'OAuth authorization failed'
          showToast("OAuth Failed", errorMsg, "destructive")
          setIsConnecting(false)
        } else if (event.data?.type === 'OAUTH_DEBUG') {
          console.log('OAuth Debug from callback:', event.data)
        }
      }
      
      console.log('OAuth parent: Setting up message listener')
      window.addEventListener('message', handleMessage)
      
      // Fallback: check if popup is closed manually
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup)
          window.removeEventListener('message', handleMessage)
          setIsConnecting(false)
          // Refresh profile data after OAuth completion
          setTimeout(fetchProfile, 1000)
        }
      }, 1000)

    } catch (error) {
      console.error('OAuth initiation error:', error)
      showToast("Connection Failed", error.message || "Failed to connect to Google Business Profile", "destructive")
      setIsConnecting(false)
    }
  }

  const fetchBusinessListings = async () => {
    try {
      setIsFetching(true)

      const { data, error } = await supabase.functions.invoke('fetch-business-listings')
      
      if (error) {
        throw new Error(error.message)
      }

      setBusinesses(data.businesses || [])
      showToast("Success", `Found ${data.businesses?.length || 0} business listings`)

    } catch (error) {
      console.error('Fetch businesses error:', error)
      showToast("Fetch Failed", error.message || "Failed to fetch business listings", "destructive")
    } finally {
      setIsFetching(false)
    }
  }

  const selectBusiness = async (business) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .update({
          google_business_id: business.name,
          company_name: business.title
        })
        .eq('user_id', user.id)

      if (error) throw error

      setSelectedBusiness(business)
      showToast("Success", `Selected business: ${business.title}`)
      fetchProfile()

    } catch (error) {
      console.error('Select business error:', error)
      showToast("Selection Failed", "Failed to select business", "destructive")
    }
  }

  const fetchBusinessProfileReviews = async () => {
    try {
      setIsFetching(true)

      const { data, error } = await supabase.functions.invoke('fetch-business-profile-reviews')
      
      if (error) {
        throw new Error(error.message)
      }

      showToast("Success", `Found ${data.reviewsFound} reviews, stored ${data.reviewsStored} new/updated reviews.`)

      // Refresh profile to update sync time
      fetchProfile()

    } catch (error) {
      console.error('Fetch reviews error:', error)
      showToast("Fetch Failed", error.message || "Failed to fetch Business Profile reviews", "destructive")
    } finally {
      setIsFetching(false)
    }
  }

  const clearGoogleAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Clear all Google-related data from profile
      const { error } = await supabase
        .from('profiles')
        .update({
          google_access_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
          google_accounts: null,
          google_selected_account: null,
          google_email: null,
          google_name: null,
          google_business_id: null,
          last_google_sync_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (error) throw error

      // Clear local state
      setProfile(null)
      setBusinesses([])
      setSelectedBusiness(null)

      // Clear any Google OAuth cookies/session
      try {
        // Open Google logout URL in hidden iframe to clear session
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        iframe.src = 'https://accounts.google.com/logout'
        document.body.appendChild(iframe)
        
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 2000)
      } catch (e) {
        console.log('Could not clear Google session:', e)
      }

      showToast("Cleared", "Google authentication has been completely cleared. You can now try connecting again.")
      
      // Refresh profile data
      setTimeout(fetchProfile, 1000)
    } catch (error) {
      console.error('Clear auth error:', error)
      showToast("Clear Failed", "Failed to clear Google authentication", "destructive")
    }
  }

  const disconnectGoogle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .update({
          google_access_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
          google_business_id: null
        })
        .eq('user_id', user.id)

      if (error) throw error

      showToast("Disconnected", "Google Business Profile has been disconnected from your account.")
      setBusinesses([])
      setSelectedBusiness(null)
      fetchProfile()
    } catch (error) {
      console.error('Disconnect error:', error)
      showToast("Disconnect Failed", "Failed to disconnect Google Business Profile", "destructive")
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Google Business Profile Integration...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const isConnected = !!profile?.google_access_token
  const isTokenExpired = profile?.google_token_expires_at 
    ? new Date(profile.google_token_expires_at) < new Date() 
    : false

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Globe className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-semibold">Google My Business</h3>
                <Badge className={isConnected && !isTokenExpired ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {isConnected && !isTokenExpired ? 'active' : 'disconnected'}
                </Badge>
              </div>
              <p className="text-gray-600 mb-4">
                Connect your Google My Business account to sync reviews and enable reply functionality
              </p>
              
              <div className="flex items-center space-x-2 mb-4">
                {isConnected && !isTokenExpired ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm text-gray-600">
                  {isConnected && !isTokenExpired ? 'Connected' : 'Not Connected'}
                </span>
                {profile?.last_google_sync_at && (
                  <span className="text-sm text-gray-500">
                    • Last sync: {new Date(profile.last_google_sync_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              {isTokenExpired && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    Your access token has expired. Please reconnect to continue.
                  </AlertDescription>
                </Alert>
              )}

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Features</h4>
                <div className="flex flex-wrap gap-2">
                  {['Review Sync', 'Reply to Reviews', 'Profile Management', 'Analytics', 'OAuth Authentication'].map((feature, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Business Selection */}
              {isConnected && !isTokenExpired && businesses.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Select Your Business</h4>
                  <div className="space-y-2">
                    {businesses.map((business, index) => (
                      <div 
                        key={index}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          profile?.google_business_id === business.name 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => selectBusiness(business)}
                      >
                        <div className="font-medium">{business.title}</div>
                        <div className="text-sm text-gray-500">{business.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            {!isConnected || isTokenExpired ? (
              <>
                <Button onClick={initiateGoogleOAuth} disabled={isConnecting}>
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect Google My Business
                    </>
                  )}
                </Button>
                
                <Button onClick={clearGoogleAuth} variant="outline" size="sm">
                  <XCircle className="w-4 h-4 mr-2" />
                  Clear Google Auth
                </Button>
              </>
            ) : (
              <>
                {businesses.length === 0 && (
                  <Button onClick={fetchBusinessListings} disabled={isFetching} variant="outline" size="sm">
                    {isFetching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load Businesses'
                    )}
                  </Button>
                )}
                <Button onClick={fetchBusinessProfileReviews} disabled={isFetching} variant="outline" size="sm">
                  {isFetching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Now
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm">
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Configure
                </Button>
                <Button onClick={disconnectGoogle} variant="outline" size="sm">
                  <Unplug className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default GoogleBusinessIntegration

