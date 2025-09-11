import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const AuthCallback = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback: Processing OAuth callback...')
        
        // Check for tokens in URL query parameters (from token capture page)
        const urlParams = new URLSearchParams(window.location.search)
        const accessToken = urlParams.get('access_token')
        const providerToken = urlParams.get('provider_token')
        const providerRefreshToken = urlParams.get('provider_refresh_token')
        
        if (accessToken && providerToken) {
          console.log('Auth callback: Tokens found in query parameters')
          
          // Get current user session
          const { data: { user } } = await supabase.auth.getUser()
          
          if (user) {
            console.log('Auth callback: Storing Google tokens for user:', user.id)
            
            // Store the Google tokens in the user's profile
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                google_access_token: providerToken,
                google_refresh_token: providerRefreshToken,
                google_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id)

            if (updateError) {
              console.error('Auth callback: Failed to store Google tokens:', updateError)
            } else {
              console.log('Auth callback: Google tokens stored successfully')
            }
          }
          
          // Redirect to settings page with success
          navigate('/settings?success=google_connected')
          return
        }
        
        // Check for tokens in URL hash (implicit flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const hashAccessToken = hashParams.get('access_token')
        const hashProviderToken = hashParams.get('provider_token')
        const hashProviderRefreshToken = hashParams.get('provider_refresh_token')
        
        if (hashAccessToken && hashProviderToken) {
          console.log('Auth callback: Implicit flow tokens found in URL hash')
          
          // Get current user session
          const { data: { user } } = await supabase.auth.getUser()
          
          if (user) {
            console.log('Auth callback: Storing Google tokens for user:', user.id)
            
            // Store the Google tokens in the user's profile
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                google_access_token: hashProviderToken,
                google_refresh_token: hashProviderRefreshToken,
                google_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id)

            if (updateError) {
              console.error('Auth callback: Failed to store Google tokens:', updateError)
            } else {
              console.log('Auth callback: Google tokens stored successfully')
            }
          }
          
          // Redirect to settings page with success
          navigate('/settings?success=google_connected')
          return
        }
        
        // Check for authorization code (Google My Business OAuth)
        const code = urlParams.get('code')
        const state = urlParams.get('state')
        const error = urlParams.get('error')
        
        if (error) {
          console.error('Auth callback: OAuth error:', error)
          navigate('/settings?error=oauth_failed')
          return
        }

        if (code) {
          console.log('Auth callback: Authorization code received, exchanging for tokens...')
          
          // Verify state parameter
          const storedState = sessionStorage.getItem('google_oauth_state')
          if (state !== storedState) {
            console.error('Auth callback: State parameter mismatch')
            navigate('/settings?error=state_mismatch')
            return
          }
          
          // Clear stored state
          sessionStorage.removeItem('google_oauth_state')
          
          try {
            // Use Supabase function for secure token exchange
            const { data: { user } } = await supabase.auth.getUser()
            
            if (!user) {
              console.error('Auth callback: No authenticated user found')
              navigate('/settings?error=no_user')
              return
            }

            // Call Supabase function to exchange code for tokens
            const { data, error } = await supabase.functions.invoke('google-business-oauth-callback', {
              body: { code, state }
            })

            if (error) {
              console.error('Auth callback: Supabase function error:', error)
              navigate('/settings?error=token_exchange_failed')
              return
            }

            if (data.error) {
              console.error('Auth callback: Token exchange error:', data.error)
              navigate('/settings?error=token_exchange_failed')
              return
            }
            
            console.log('Auth callback: Google My Business tokens stored successfully')
            navigate('/settings?success=google_business_connected')
            return
            
          } catch (tokenError) {
            console.error('Auth callback: Token exchange error:', tokenError)
            navigate('/settings?error=token_exchange_failed')
            return
          }
        } else {
          console.error('Auth callback: No authorization code or access token found')
          navigate('/settings?error=no_code')
        }
      } catch (error) {
        console.error('Auth callback: Unexpected error:', error)
        navigate('/settings?error=unexpected')
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Authentication</h2>
        <p className="text-gray-600">
          Please wait while we complete your Google My Business connection...
        </p>
      </div>
    </div>
  )
}

export default AuthCallback

