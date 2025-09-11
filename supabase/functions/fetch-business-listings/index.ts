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

    // Get user's Google tokens
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('google_access_token, google_refresh_token, google_token_expires_at')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.google_access_token) {
      throw new Error('Google account not connected')
    }

    // Check if token is expired and refresh if needed
    let accessToken = profile.google_access_token
    if (profile.google_token_expires_at && new Date(profile.google_token_expires_at) < new Date()) {
      console.log('Token expired, refreshing...')
      
      if (!profile.google_refresh_token) {
        throw new Error('Token expired and no refresh token available. Please reconnect.')
      }

      // Refresh the token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
          refresh_token: profile.google_refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh access token')
      }

      const refreshData = await refreshResponse.json()
      accessToken = refreshData.access_token

      // Update the stored token
      const expiresAt = new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString()
      await supabaseClient
        .from('profiles')
        .update({
          google_access_token: accessToken,
          google_token_expires_at: expiresAt,
        })
        .eq('user_id', user.id)
    }

    // Fetch business accounts from Google My Business API
    console.log('Fetching business accounts...')
    const accountsResponse = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text()
      console.error('Accounts API error:', errorText)
      throw new Error('Failed to fetch business accounts')
    }

    const accountsData = await accountsResponse.json()
    console.log('Accounts response:', accountsData)

    const businesses = []

    // For each account, fetch the locations (businesses)
    if (accountsData.accounts) {
      for (const account of accountsData.accounts) {
        try {
          console.log(`Fetching locations for account: ${account.name}`)
          
          const locationsResponse = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          )

          if (locationsResponse.ok) {
            const locationsData = await locationsResponse.json()
            console.log(`Locations for ${account.name}:`, locationsData)

            if (locationsData.locations) {
              for (const location of locationsData.locations) {
                businesses.push({
                  name: location.name,
                  title: location.title || location.languageCode || 'Business Location',
                  address: location.address?.formattedAddress || 'No address',
                  accountName: account.name,
                  accountDisplayName: account.accountName || account.name,
                })
              }
            }
          } else {
            console.error(`Failed to fetch locations for account ${account.name}`)
          }
        } catch (error) {
          console.error(`Error fetching locations for account ${account.name}:`, error)
        }
      }
    }

    console.log(`Found ${businesses.length} business locations`)

    return new Response(
      JSON.stringify({ 
        success: true,
        businesses: businesses,
        accountsCount: accountsData.accounts?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Fetch business listings error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to fetch business listings'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

