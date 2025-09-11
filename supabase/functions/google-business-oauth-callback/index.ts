import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('User not authenticated')
    }

    // Parse request body
    const { code, state } = await req.json()

    if (!code) {
      throw new Error('Authorization code not provided')
    }

    // Verify state parameter (optional but recommended)
    if (state) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('oauth_state')
        .eq('user_id', user.id)
        .single()

      if (profile?.oauth_state !== state) {
        throw new Error('Invalid state parameter')
      }
    }

    // Google OAuth configuration
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI') || `${new URL(req.url).origin}/oauth-callback.html`

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured')
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange error:', errorData)
      throw new Error('Failed to exchange authorization code for tokens')
    }

    const tokenData = await tokenResponse.json()
    console.log('Token exchange successful')

    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()

    // Store tokens in user profile
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .upsert({
        user_id: user.id,
        google_access_token: tokenData.access_token,
        google_refresh_token: tokenData.refresh_token,
        google_token_expires_at: expiresAt,
        oauth_state: null, // Clear the state
        updated_at: new Date().toISOString()
      })

    if (updateError) {
      console.error('Profile update error:', updateError)
      throw new Error('Failed to store OAuth tokens')
    }

    // Get user info from Google
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      })

      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json()
        console.log('User info retrieved:', userInfo.email)
        
        // Update profile with user info
        await supabaseClient
          .from('profiles')
          .update({
            google_email: userInfo.email,
            google_name: userInfo.name,
          })
          .eq('user_id', user.id)
      }
    } catch (error) {
      console.error('Failed to get user info:', error)
      // Don't fail the whole process if user info fails
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'OAuth tokens stored successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('OAuth callback error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process OAuth callback'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

