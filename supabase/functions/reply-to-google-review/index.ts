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
    const { reviewId, replyText } = await req.json()

    if (!reviewId || !replyText) {
      throw new Error('Review ID and reply text are required')
    }

    // Get user's Google tokens and selected business
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('google_access_token, google_refresh_token, google_token_expires_at, google_business_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.google_access_token) {
      throw new Error('Google account not connected')
    }

    if (!profile.google_business_id) {
      throw new Error('No business selected. Please select a business first.')
    }

    // Get the review from database to get the correct Google Business Review ID
    const { data: review, error: reviewError } = await supabaseClient
      .from('google_reviews')
      .select('google_business_review_id, google_review_id, author_name')
      .eq('id', reviewId)
      .eq('user_id', user.id)
      .single()

    if (reviewError || !review) {
      throw new Error('Review not found')
    }

    if (!review.google_business_review_id) {
      throw new Error('This review does not have a valid Google Business Review ID for replies')
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

    // Send reply to Google My Business API
    console.log(`Replying to review: ${review.google_business_review_id}`)
    
    const replyPayload = {
      comment: replyText
    }

    // Try the newer API endpoint first
    let replyResponse = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${review.google_business_review_id}/reply`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(replyPayload),
      }
    )

    // If newer API fails, try the older API
    if (!replyResponse.ok) {
      console.log('Newer API failed, trying older API...')
      replyResponse = await fetch(
        `https://mybusiness.googleapis.com/v4/${review.google_business_review_id}/reply`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(replyPayload),
        }
      )
    }

    if (!replyResponse.ok) {
      const errorText = await replyResponse.text()
      console.error('Reply API error:', errorText)
      throw new Error(`Failed to send reply to Google: ${errorText}`)
    }

    const replyData = await replyResponse.json()
    console.log('Reply sent successfully:', replyData)

    // Update the review in our database with the reply
    const { error: updateError } = await supabaseClient
      .from('google_reviews')
      .update({
        reply_comment: replyText,
        reply_datetime: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating review with reply:', updateError)
      // Don't fail the whole operation if database update fails
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Reply sent successfully to review by ${review.author_name}`,
        replyText: replyText
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Reply to Google review error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to reply to Google review'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

