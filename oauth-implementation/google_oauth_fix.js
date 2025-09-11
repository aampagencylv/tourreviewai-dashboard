/**
 * Google OAuth Fix for ReviewFlow
 * 
 * This script fixes the Google OAuth flow to properly open a popup window
 * instead of showing the URL as a message or doing nothing.
 */

// Function to open the Google OAuth popup window
function openGoogleOAuthPopup() {
  // Call the Supabase function to get the OAuth URL
  fetch('/api/google-business-oauth')
    .then(response => response.json())
    .then(data => {
      if (!data.authUrl) {
        throw new Error('No authorization URL received');
      }
      
      // Open the OAuth popup window
      const popup = window.open(
        data.authUrl,
        'google_oauth',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );
      
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        alert('Popup blocked! Please allow popups for this site and try again.');
        return;
      }
      
      // Set up message listener for the OAuth callback
      const handleMessage = (event) => {
        if (event.data?.type === 'oauth_callback') {
          window.removeEventListener('message', handleMessage);
          
          // Close the popup
          try { if (popup && !popup.closed) popup.close(); } catch {}
          
          // Handle the OAuth code
          if (event.data.code) {
            // Send the code to the backend
            fetch('/api/google-business-oauth-callback', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ code: event.data.code }),
            })
            .then(() => {
              alert('Google Business Profile connected successfully!');
              // Refresh the page to show the connected state
              setTimeout(() => window.location.reload(), 1000);
            })
            .catch((error) => {
              console.error('OAuth callback error:', error);
              alert('Failed to complete Google OAuth: ' + error.message);
            });
          } else {
            alert('Connection Failed: ' + (event.data.error || 'Unknown error'));
          }
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Fallback: check if popup is closed manually
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          window.removeEventListener('message', handleMessage);
          // Refresh the page to check if the connection was successful
          setTimeout(() => window.location.reload(), 1000);
        }
      }, 1000);
    })
    .catch(error => {
      console.error('OAuth error:', error);
      alert('Failed to connect: ' + error.message);
    });
}

// Add a button to the page to test the OAuth flow
const button = document.createElement('a');
button.textContent = 'Open Google OAuth';
button.href = '#';
button.style.position = 'fixed';
button.style.top = '10px';
button.style.right = '10px';
button.style.padding = '5px 10px';
button.style.backgroundColor = '#4285f4';
button.style.color = 'white';
button.style.borderRadius = '4px';
button.style.textDecoration = 'none';
button.style.zIndex = '9999';
button.onclick = (e) => {
  e.preventDefault();
  openGoogleOAuthPopup();
};
document.body.appendChild(button);

// Find the "Connect Google My Business" button and add the OAuth handler
const connectButtons = Array.from(document.querySelectorAll('button')).filter(
  button => button.textContent.includes('Connect Google My Business')
);

if (connectButtons.length > 0) {
  connectButtons.forEach(button => {
    // Replace the existing click handler with our OAuth handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openGoogleOAuthPopup();
    }, true);
  });
  
  alert('Google OAuth fix applied! Click "Connect Google My Business" to test.');
} else {
  alert('Could not find the "Connect Google My Business" button. The fix was not applied.');
}

