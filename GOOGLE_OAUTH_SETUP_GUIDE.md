# 🔐 Google OAuth Integration Setup Guide

This guide will walk you through setting up Google OAuth integration for the TourReviewAI dashboard, enabling users to connect their Google My Business accounts and reply directly to Google reviews.

## 📋 **Prerequisites**

- Google Cloud Console account
- Google My Business account (verified business)
- Supabase project with admin access
- Domain where your app is hosted

---

## 🚀 **Step 1: Google Cloud Console Setup**

### 1.1 Create a New Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name: `TourReviewAI OAuth`
4. Click "Create"

### 1.2 Enable Required APIs
Navigate to "APIs & Services" → "Library" and enable:
- **Google My Business API**
- **Google My Business Business Information API** 
- **Google My Business Account Management API**
- **Google+ API** (for user profile info)

### 1.3 Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" (unless you have Google Workspace)
3. Fill in required fields:
   - **App name**: `TourReviewAI`
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/business.manage`
   - `https://www.googleapis.com/auth/plus.business.manage`
   - `openid`
   - `email`
   - `profile`
5. Add test users (your email and any test accounts)

### 1.4 Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Application type: "Web application"
4. Name: `TourReviewAI Web Client`
5. **Authorized JavaScript origins**:
   ```
   http://localhost:5173
   https://your-domain.com
   https://your-deployed-app.manus.space
   ```
6. **Authorized redirect URIs**:
   ```
   http://localhost:5173/oauth-callback.html
   https://your-domain.com/oauth-callback.html
   https://your-deployed-app.manus.space/oauth-callback.html
   ```
7. Click "Create"
8. **Save the Client ID and Client Secret** - you'll need these!

---

## 🔧 **Step 2: Supabase Configuration**

### 2.1 Set Environment Variables
In your Supabase project, go to "Settings" → "Edge Functions" → "Environment Variables" and add:

```bash
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=https://your-domain.com/oauth-callback.html
```

### 2.2 Deploy Database Migration
Run the SQL migration to create necessary tables and columns:

```sql
-- Copy and paste the content from supabase/migrations/20240911_google_oauth_integration.sql
-- into your Supabase SQL editor and execute
```

### 2.3 Deploy Edge Functions
Deploy the Supabase Edge Functions:

```bash
# Deploy OAuth initiation function
supabase functions deploy google-business-oauth

# Deploy OAuth callback function  
supabase functions deploy google-business-oauth-callback

# Deploy business listings function
supabase functions deploy fetch-business-listings

# Deploy reviews fetch function
supabase functions deploy fetch-business-profile-reviews

# Deploy reply function
supabase functions deploy reply-to-google-review
```

---

## 🌐 **Step 3: Frontend Integration**

### 3.1 OAuth Callback Page
Ensure `oauth-callback.html` is in your `public` directory and accessible at:
- `https://your-domain.com/oauth-callback.html`

### 3.2 Environment Variables
Add to your `.env` file:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 🧪 **Step 4: Testing the Integration**

### 4.1 Test OAuth Flow
1. Navigate to Settings → Integrations
2. Click "Connect Google My Business"
3. Should open popup with Google OAuth
4. Grant permissions
5. Should see "Connected" status

### 4.2 Test Business Listings
1. After connecting, click "Load Businesses"
2. Should see list of your Google My Business locations
3. Select a business

### 4.3 Test Review Sync
1. Click "Sync Now" 
2. Should fetch reviews with correct IDs for replies
3. Check database for `google_reviews` table entries

### 4.4 Test Review Replies
1. Go to Dashboard → Reviews
2. Find a Google review
3. Click "Reply on google"
4. Enter reply text and submit
5. Should post reply to Google My Business

---

## 🔍 **Step 5: Troubleshooting**

### Common Issues:

#### 1. "Popup blocked" Error
- **Solution**: Allow popups for your domain in browser settings

#### 2. "Invalid redirect URI" Error
- **Solution**: Ensure redirect URI in Google Console exactly matches your domain
- Check for trailing slashes, http vs https

#### 3. "Access denied" Error
- **Solution**: 
  - Verify business is verified in Google My Business
  - Ensure user is owner/manager of the business
  - Check OAuth scopes are correctly configured

#### 4. "Token expired" Error
- **Solution**: The system should auto-refresh tokens
- If persistent, user needs to reconnect

#### 5. "Failed to fetch business listings" Error
- **Solution**:
  - Verify APIs are enabled in Google Cloud Console
  - Check if business has locations in Google My Business
  - Ensure proper OAuth scopes

---

## 📊 **Step 6: Monitoring & Maintenance**

### 6.1 Monitor API Usage
- Check Google Cloud Console → APIs & Services → Quotas
- Monitor for rate limits

### 6.2 Token Management
- Tokens automatically refresh
- Monitor for refresh token expiration (rare)

### 6.3 Error Logging
- Check Supabase Edge Functions logs
- Monitor browser console for frontend errors

---

## 🎯 **Step 7: Production Deployment**

### 7.1 Update OAuth Settings
1. Add production domain to Google OAuth settings
2. Update Supabase environment variables
3. Test OAuth flow on production

### 7.2 Security Considerations
- Use HTTPS only in production
- Regularly rotate client secrets
- Monitor for suspicious OAuth activity

---

## 📚 **API Reference**

### Available Supabase Functions:

1. **`google-business-oauth`** - Initiates OAuth flow
2. **`google-business-oauth-callback`** - Handles OAuth callback
3. **`fetch-business-listings`** - Gets user's businesses
4. **`fetch-business-profile-reviews`** - Syncs reviews with correct IDs
5. **`reply-to-google-review`** - Posts replies to Google

### Database Tables:

1. **`profiles`** - Extended with Google OAuth fields
2. **`google_reviews`** - Stores Google reviews with reply IDs

---

## ✅ **Success Checklist**

- [ ] Google Cloud project created and APIs enabled
- [ ] OAuth consent screen configured
- [ ] OAuth credentials created with correct redirect URIs
- [ ] Supabase environment variables set
- [ ] Database migration executed
- [ ] Edge functions deployed
- [ ] OAuth callback page accessible
- [ ] OAuth flow tested successfully
- [ ] Business listings fetched
- [ ] Reviews synced with correct IDs
- [ ] Reply functionality tested

---

## 🆘 **Support**

If you encounter issues:
1. Check browser console for errors
2. Check Supabase Edge Functions logs
3. Verify Google Cloud Console configuration
4. Test with a different Google account
5. Ensure business is verified in Google My Business

**The integration enables direct replies to Google reviews using the correct business owner review IDs that are only accessible through authenticated Google My Business API calls!** 🎉

