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

    // Get current profile with tokens
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('google_refresh_token, google_token_expires_at, google_access_token')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('Profile not found')
    }

    if (!profile.google_refresh_token) {
      throw new Error('No refresh token available')
    }

    // Check if token needs refresh (expires within 5 minutes)
    const now = new Date()
    const expiresAt = new Date(profile.google_token_expires_at)
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

    let accessToken = profile.google_access_token
    let tokenExpiresAt = profile.google_token_expires_at

    if (expiresAt <= fiveMinutesFromNow) {
      console.log('Token expired or expires soon, refreshing...')

      // Google OAuth configuration
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

      if (!clientId || !clientSecret) {
        throw new Error('Google OAuth credentials not configured')
      }

      // Refresh the token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: profile.google_refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text()
        console.error('Token refresh error:', errorData)
        throw new Error('Failed to refresh access token')
      }

      const tokenData = await tokenResponse.json()
      console.log('Token refreshed successfully')

      // Calculate new expiration time
      const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()

      // Update profile with new token
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          google_access_token: tokenData.access_token,
          google_token_expires_at: newExpiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        throw new Error('Failed to store refreshed token')
      }

      accessToken = tokenData.access_token
      tokenExpiresAt = newExpiresAt
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        access_token: accessToken,
        expires_at: tokenExpiresAt,
        refreshed: expiresAt <= fiveMinutesFromNow
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Token refresh error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to refresh token'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

