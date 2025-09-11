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

    // Fetch reviews from Google My Business API
    console.log(`Fetching reviews for business: ${profile.google_business_id}`)
    const reviewsResponse = await fetch(
      `https://mybusiness.googleapis.com/v4/${profile.google_business_id}/reviews`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!reviewsResponse.ok) {
      const errorText = await reviewsResponse.text()
      console.error('Reviews API error:', errorText)
      
      // Try the newer API endpoint
      const newReviewsResponse = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${profile.google_business_id}/reviews`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!newReviewsResponse.ok) {
        const newErrorText = await newReviewsResponse.text()
        console.error('New Reviews API error:', newErrorText)
        throw new Error('Failed to fetch reviews from Google My Business API')
      }

      const newReviewsData = await newReviewsResponse.json()
      console.log('Reviews fetched from new API:', newReviewsData)
      
      return new Response(
        JSON.stringify({ 
          success: true,
          reviewsFound: newReviewsData.reviews?.length || 0,
          reviewsStored: 0,
          message: 'Reviews fetched successfully from new API',
          reviews: newReviewsData.reviews || []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    const reviewsData = await reviewsResponse.json()
    console.log('Reviews response:', reviewsData)

    let reviewsStored = 0
    const reviews = reviewsData.reviews || []

    // Store/update reviews in the database with correct Google review IDs
    for (const review of reviews) {
      try {
        // Extract the review data
        const reviewData = {
          google_review_id: review.reviewId || review.name,
          google_business_review_id: review.name, // This is the ID needed for replies
          author_name: review.reviewer?.displayName || 'Anonymous',
          author_photo_url: review.reviewer?.profilePhotoUrl,
          rating: review.starRating || 0,
          comment: review.comment || '',
          review_datetime: review.createTime || new Date().toISOString(),
          reply_comment: review.reviewReply?.comment || null,
          reply_datetime: review.reviewReply?.updateTime || null,
          source: 'google_business_profile',
          user_id: user.id
        }

        // Insert or update the review
        const { error: insertError } = await supabaseClient
          .from('google_reviews')
          .upsert(reviewData, {
            onConflict: 'google_review_id',
            ignoreDuplicates: false
          })

        if (insertError) {
          console.error('Error storing review:', insertError)
        } else {
          reviewsStored++
        }
      } catch (error) {
        console.error('Error processing review:', error)
      }
    }

    // Update last sync time
    await supabaseClient
      .from('profiles')
      .update({
        last_google_sync_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        reviewsFound: reviews.length,
        reviewsStored: reviewsStored,
        message: `Successfully processed ${reviewsStored} reviews`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Fetch business profile reviews error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to fetch business profile reviews'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

