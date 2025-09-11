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
  XCircle,
  Building2,
  MapPin,
  Phone
} from 'lucide-react'

const GoogleBusinessIntegration = () => {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [businesses, setBusinesses] = useState([])
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('google_access_token, google_token_expires_at, last_google_sync_at, company_name, google_business_id, selected_business_id, selected_business_name')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      setProfile(data)
      
      if (data.selected_business_id) {
        setSelectedBusiness({
          id: data.selected_business_id,
          name: data.selected_business_name
        })
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      setIsConnecting(true)
      setStatusMessage('Initiating Google OAuth...')
      
      // Use Supabase's built-in OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/business.manage email profile openid',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo: 'https://tourrevai-qfxo7m.manus.space/auth/callback'
        }
      })

      if (error) {
        console.error('OAuth error:', error)
        setStatusMessage('OAuth authentication failed: ' + error.message)
      } else {
        console.log('OAuth initiated successfully:', data)
        setStatusMessage('Redirecting to Google for authentication...')
      }
    } catch (error) {
      console.error('Connection error:', error)
      setStatusMessage('Connection failed: ' + error.message)
    } finally {
      setIsConnecting(false)
    }
  }

  const fetchBusinessListings = async () => {
    try {
      setIsLoadingBusinesses(true)
      setStatusMessage('Fetching your business listings...')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      if (!profile?.google_access_token) {
        throw new Error('No Google access token found')
      }

      // Call Google My Business API to get business listings
      const response = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: {
          'Authorization': `Bearer ${profile.google_access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Google API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Google My Business accounts:', data)

      if (data.accounts && data.accounts.length > 0) {
        // For each account, fetch the locations (businesses)
        const allBusinesses = []
        
        for (const account of data.accounts) {
          try {
            const locationsResponse = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`, {
              headers: {
                'Authorization': `Bearer ${profile.google_access_token}`,
                'Content-Type': 'application/json'
              }
            })

            if (locationsResponse.ok) {
              const locationsData = await locationsResponse.json()
              if (locationsData.locations) {
                allBusinesses.push(...locationsData.locations.map(location => ({
                  id: location.name,
                  name: location.title || location.storefrontAddress?.addressLines?.[0] || 'Unnamed Business',
                  address: location.storefrontAddress ? 
                    `${location.storefrontAddress.addressLines?.join(', ') || ''}, ${location.storefrontAddress.locality || ''}, ${location.storefrontAddress.administrativeArea || ''}`.replace(/^,\s*/, '') : 
                    'No address',
                  phone: location.primaryPhone || 'No phone',
                  website: location.websiteUri || 'No website',
                  account: account.accountName || account.name
                })))
              }
            }
          } catch (locationError) {
            console.error('Error fetching locations for account:', account.name, locationError)
          }
        }

        setBusinesses(allBusinesses)
        setStatusMessage(`Found ${allBusinesses.length} business listing(s)`)
      } else {
        setBusinesses([])
        setStatusMessage('No business listings found')
      }
    } catch (error) {
      console.error('Error fetching business listings:', error)
      setStatusMessage('Error fetching business listings: ' + error.message)
    } finally {
      setIsLoadingBusinesses(false)
    }
  }

  const selectBusiness = async (business) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Store selected business in user profile
      const { error } = await supabase
        .from('profiles')
        .update({
          selected_business_id: business.id,
          selected_business_name: business.name,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (error) {
        console.error('Error saving selected business:', error)
        setStatusMessage('Error saving selected business')
      } else {
        setSelectedBusiness(business)
        setStatusMessage(`Selected business: ${business.name}`)
        // Refresh profile to get updated data
        fetchProfile()
      }
    } catch (error) {
      console.error('Error selecting business:', error)
      setStatusMessage('Error selecting business')
    }
  }

  const handleDisconnect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Clear Google tokens from user profile
      const { error } = await supabase
        .from('profiles')
        .update({
          google_access_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
          selected_business_id: null,
          selected_business_name: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (error) {
        console.error('Error disconnecting:', error)
      } else {
        setProfile(null)
        setBusinesses([])
        setSelectedBusiness(null)
        setStatusMessage('Disconnected from Google My Business')
        fetchProfile()
      }
    } catch (error) {
      console.error('Error disconnecting:', error)
    }
  }

  const clearGoogleAuth = async () => {
    try {
      // Clear local storage and session storage
      localStorage.clear()
      sessionStorage.clear()
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Clear Google auth by opening logout iframe
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = 'https://accounts.google.com/logout'
      document.body.appendChild(iframe)
      
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
      
      setStatusMessage('Google authentication cleared. Please refresh the page and sign in again.')
    } catch (error) {
      console.error('Error clearing Google auth:', error)
      setStatusMessage('Error clearing authentication')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading Google My Business integration...</span>
      </div>
    )
  }

  const isConnected = profile?.google_access_token

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Google My Business Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-green-700">Connected</span>
                  <Badge variant="secondary">Active</Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-red-700">Not Connected</span>
                  <Badge variant="destructive">Inactive</Badge>
                </>
              )}
            </div>
            
            <div className="flex gap-2">
              {isConnected ? (
                <>
                  <Button 
                    onClick={fetchBusinessListings}
                    disabled={isLoadingBusinesses}
                    variant="outline"
                    size="sm"
                  >
                    {isLoadingBusinesses ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Fetch Businesses
                  </Button>
                  <Button 
                    onClick={handleDisconnect}
                    variant="outline"
                    size="sm"
                  >
                    <Unplug className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleConnect}
                    disabled={isConnecting}
                    size="sm"
                  >
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Connect Google My Business
                  </Button>
                  <Button 
                    onClick={clearGoogleAuth}
                    variant="outline"
                    size="sm"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Clear Google Auth
                  </Button>
                </>
              )}
            </div>
          </div>

          {statusMessage && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          )}

          {/* Token Capture Instructions */}
          {!isConnected && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> If you get redirected to localhost:3000, copy that URL and visit: 
                <br />
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                  https://tourrevai-qfxo7m.manus.space/token-capture.html
                </code>
                <br />
                Then paste the localhost URL in the address bar to extract your tokens.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Selected Business */}
      {selectedBusiness && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Selected Business
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{selectedBusiness.name}</h3>
                <p className="text-sm text-gray-600">Business ID: {selectedBusiness.id}</p>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Business Listings */}
      {businesses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Your Business Listings ({businesses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {businesses.map((business) => (
                <div 
                  key={business.id} 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedBusiness?.id === business.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => selectBusiness(business)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{business.name}</h3>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{business.address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{business.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span>{business.website}</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          {business.account}
                        </Badge>
                      </div>
                    </div>
                    <div className="ml-4">
                      {selectedBusiness?.id === business.id ? (
                        <Badge variant="default">Selected</Badge>
                      ) : (
                        <Button variant="outline" size="sm">
                          Select
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <RefreshCw className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <div className="text-sm font-medium">Review Sync</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <ExternalLink className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <div className="text-sm font-medium">Reply to Reviews</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <SettingsIcon className="h-6 w-6 mx-auto mb-2 text-purple-500" />
              <div className="text-sm font-medium">Profile Management</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <Info className="h-6 w-6 mx-auto mb-2 text-orange-500" />
              <div className="text-sm font-medium">Analytics</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default GoogleBusinessIntegration

