import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ExternalLink, RefreshCw, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface Profile {
  google_access_token?: string;
  google_token_expires_at?: string;
  last_google_sync_at?: string;
  company_name?: string;
}

export const GoogleBusinessProfileIntegration = () => {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('google_access_token, google_token_expires_at, last_google_sync_at, company_name')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const initiateGoogleOAuth = async () => {
    try {
      setIsConnecting(true);

      const { data, error } = await supabase.functions.invoke('google-business-oauth');
      
      if (error) {
        throw new Error(error.message);
      }

      if (!data?.authUrl) {
        throw new Error('No authorization URL received');
      }

      console.log('Opening OAuth URL:', data.authUrl);
      
      // Open OAuth popup window
      const popup = window.open(
        data.authUrl,
        'google_oauth',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        throw new Error('Popup blocked! Please allow popups for this site and try again.');
      }

      // Set up message listener for the OAuth callback
      const handleMessage = (event: MessageEvent) => {
        console.log('OAuth parent: Received message:', event.data);
        if (event.data?.type === 'oauth_callback') {
          console.log('OAuth parent: Callback received, cleaning up');
          window.removeEventListener('message', handleMessage);
          
          // Close the popup
          try { if (popup && !popup.closed) popup.close(); } catch {}
          
          // Handle the OAuth code
          if (event.data.code) {
            // Send the code to the backend
            supabase.functions.invoke('google-business-oauth-callback', {
              body: { code: event.data.code }
            })
            .then(() => {
              toast({
                title: "Success",
                description: "Google Business Profile connected successfully!"
              });
              // Refresh profile data after OAuth completion
              setTimeout(fetchProfile, 1000);
            })
            .catch((error) => {
              console.error('OAuth callback error:', error);
              toast({
                title: "Connection Failed",
                description: "Failed to complete Google OAuth",
                variant: "destructive",
              });
            })
            .finally(() => {
              setIsConnecting(false);
            });
          } else {
            toast({
              title: "Connection Failed",
              description: event.data.error || "Failed to connect to Google Business Profile",
              variant: "destructive",
            });
            setIsConnecting(false);
          }
        }
      };
      
      console.log('OAuth parent: Setting up message listener');
      window.addEventListener('message', handleMessage);
      
      // Fallback: check if popup is closed manually
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
          // Refresh profile data after OAuth completion
          setTimeout(fetchProfile, 1000);
        }
      }, 1000);

    } catch (error) {
      console.error('OAuth initiation error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Google Business Profile",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const fetchBusinessProfileReviews = async () => {
    try {
      setIsFetching(true);

      const { data, error } = await supabase.functions.invoke('fetch-business-profile-reviews');
      
      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Reviews Fetched Successfully",
        description: `Found ${data.reviewsFound} reviews, stored ${data.reviewsStored} new/updated reviews.`,
      });

      // Refresh profile to update sync time
      fetchProfile();

    } catch (error) {
      console.error('Fetch reviews error:', error);
      toast({
        title: "Fetch Failed",
        description: error.message || "Failed to fetch Business Profile reviews",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const disconnectGoogle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          google_access_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Disconnected",
        description: "Google Business Profile has been disconnected from your account.",
      });

      fetchProfile();
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect Google Business Profile",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Google Business Profile Integration...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const isConnected = !!profile?.google_access_token;
  const isTokenExpired = profile?.google_token_expires_at 
    ? new Date(profile.google_token_expires_at) < new Date() 
    : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Google Business Profile Integration
          {isConnected && !isTokenExpired && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
          {isTokenExpired && (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              Token Expired
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Connect your Google Business Profile to fetch authentic review IDs that can be used for replying to reviews.
          This provides the correct review identifiers that the public APIs cannot access.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Why Google Business Profile OAuth?</strong><br />
            DataForSEO and Google Places API only provide "public" review IDs. To reply to reviews, 
            you need the "business owner" review IDs that are only accessible through authenticated 
            Google Business Profile API calls.
          </AlertDescription>
        </Alert>

        {!isConnected ? (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                To use this feature, you need to:
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Have a verified Google Business Profile</li>
                  <li>Be the owner/manager of the business</li>
                  <li>Grant permission to access your Business Profile data</li>
                </ol>
              </AlertDescription>
            </Alert>

            <Button 
              onClick={initiateGoogleOAuth}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect Google Business Profile
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {profile?.last_google_sync_at && (
              <p className="text-sm text-muted-foreground">
                Last synced: {new Date(profile.last_google_sync_at).toLocaleString()}
              </p>
            )}

            {isTokenExpired && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your access token has expired. Please reconnect to continue fetching reviews.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={fetchBusinessProfileReviews}
                disabled={isFetching || isTokenExpired}
                variant="default"
              >
                {isFetching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Fetching Reviews...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Fetch Reviews with Correct IDs
                  </>
                )}
              </Button>

              <Button 
                onClick={isTokenExpired ? initiateGoogleOAuth : disconnectGoogle}
                variant={isTokenExpired ? "default" : "outline"}
              >
                {isTokenExpired ? (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Reconnect
                  </>
                ) : (
                  'Disconnect'
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

