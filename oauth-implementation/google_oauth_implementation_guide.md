# Google OAuth Implementation Guide

This guide explains how to fix the Google OAuth flow in your ReviewFlow application to properly open a popup window instead of showing the URL as a message or doing nothing.

## Files Included

1. **google_oauth_fix.js** - The JavaScript code that fixes the Google OAuth flow
2. **oauth-callback.html** - The HTML page that handles the OAuth callback

## Implementation Steps

### 1. Add the OAuth Callback HTML File

1. Upload the `oauth-callback.html` file to the root directory of your website
2. This file should be accessible at `https://your-domain.com/oauth-callback.html`

### 2. Add the Google OAuth Fix JavaScript

#### Option 1: Include as a Separate Script

1. Upload the `google_oauth_fix.js` file to your website
2. Add the following script tag to your HTML:

```html
<script src="/google_oauth_fix.js"></script>
```

#### Option 2: Integrate into Your Existing Code

1. Open your `src/components/GoogleBusinessProfileIntegration.tsx` file
2. Replace the existing OAuth implementation with the code from `google_oauth_fix.js`
3. Make sure to adapt the code to fit your TypeScript/React component structure

### 3. Update Google Cloud Console Configuration

1. Go to your Google Cloud Console project
2. Navigate to "APIs & Services" > "Credentials"
3. Edit your OAuth 2.0 Client ID
4. Add the following URL to the "Authorized redirect URIs":
   - `https://your-domain.com/oauth-callback.html`

### 4. Update Supabase Environment Variables

1. Log in to your Supabase dashboard
2. Go to your project settings
3. Navigate to "API" > "Environment Variables"
4. Set the following environment variables:
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret
   - `GOOGLE_REDIRECT_URI`: https://your-domain.com/oauth-callback.html

## How It Works

1. When the user clicks "Connect Google My Business", a popup window opens with the Google authorization page
2. The user grants permissions in the popup window
3. Google redirects to the callback URL (`oauth-callback.html`)
4. The callback page extracts the authorization code and sends it back to the main window
5. The main window sends the code to your backend for processing
6. The backend exchanges the code for access and refresh tokens
7. The backend stores the tokens and connects the Google My Business account

## Troubleshooting

### Popup Blocked

If the popup is blocked, make sure:
1. Popup blockers are disabled for your site
2. The popup is opened in direct response to a user action (like a click)

### Redirect URI Mismatch

If you get a "redirect_uri_mismatch" error:
1. Check that the redirect URI in your Google Cloud Console matches exactly
2. The URI should be `https://your-domain.com/oauth-callback.html`

### CORS Issues

If you get CORS errors:
1. Make sure the `postMessage` is using the correct origin
2. The callback page and main page must be on the same domain

## Testing

After implementation:
1. Go to Settings > Integrations
2. Click "Connect Google My Business"
3. A popup window should open with the Google authorization page
4. After granting permissions, the popup should close automatically
5. The main page should refresh and show "Connected" status


