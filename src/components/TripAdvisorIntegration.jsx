import React, { useState, useEffect } from 'react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { supabase } from '../lib/supabase'
import { 
  Globe, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Star, 
  Lock,
  Unlock,
  Calendar,
  TrendingUp,
  Download
} from 'lucide-react'

const TripAdvisorIntegration = () => {
  const [tripadvisorUrl, setTripadvisorUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [importProgress, setImportProgress] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isUrlLocked, setIsUrlLocked] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setIsLoadingProfile(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        if (profileData.tripadvisor_url) {
          setTripadvisorUrl(profileData.tripadvisor_url)
        }
        setIsUrlLocked(profileData.tripadvisor_url_locked || false)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const handleUrlChange = (e) => {
    if (!isUrlLocked) {
      setTripadvisorUrl(e.target.value)
      setError('')
    }
  }

  const validateTripAdvisorUrl = (url) => {
    if (!url) return false
    return url.includes('tripadvisor.com') && url.includes('Reviews-')
  }

  const handleImport = async () => {
    if (!tripadvisorUrl) {
      setError('Please enter a TripAdvisor URL')
      return
    }

    if (!validateTripAdvisorUrl(tripadvisorUrl)) {
      setError('Please enter a valid TripAdvisor reviews URL')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')
    setImportProgress({
      status: 'starting',
      platform: 'tripadvisor',
      totalCount: 0,
      importedCount: 0
    })

    try {
      // Call the new smart import function
      const { data, error } = await supabase.functions.invoke('smart-review-import', {
        body: {
          platforms: ['tripadvisor'],
          tripadvisor_url: tripadvisorUrl,
        }
      })

      if (error) {
        console.error('Smart import error:', error)
        throw new Error(error.message || 'Import failed')
      }

      console.log('Smart import result:', data)

      const result = data?.results?.tripadvisor
      if (result) {
        setImportProgress({
          status: result.status,
          platform: 'tripadvisor',
          totalCount: result.totalCount || 0,
          importedCount: result.importedCount || 0
        })

        if (result.status === 'completed') {
          setSuccess(`Successfully imported ${result.importedCount} reviews!`)
          setIsUrlLocked(true)
          await fetchProfile() // Refresh profile data
        } else if (result.status === 'error') {
          throw new Error(result.error || 'Import failed')
        }
      }

    } catch (error) {
      console.error('Import error:', error)
      setError(`Import failed: ${error.message}`)
      setImportProgress(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlockUrl = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .update({ 
          tripadvisor_url_locked: false,
          tripadvisor_url: null 
        })
        .eq('user_id', user.id)

      if (error) throw error

      setIsUrlLocked(false)
      setTripadvisorUrl('')
      setImportProgress(null)
      setSuccess('')
      await fetchProfile()

    } catch (error) {
      console.error('Error unlocking URL:', error)
      setError('Failed to unlock URL')
    }
  }

  const renderProgressBar = () => {
    if (!importProgress) return null

    const progressPercentage = importProgress.totalCount > 0 
      ? (importProgress.importedCount / importProgress.totalCount) * 100 
      : 0

    return (
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-900">
            Import Progress
          </span>
          <span className="text-sm text-blue-700">
            {importProgress.importedCount}/{importProgress.totalCount} reviews
          </span>
        </div>
        
        <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        
        <div className="flex items-center text-sm text-blue-700">
          {importProgress.status === 'starting' && (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Starting import...
            </>
          )}
          {importProgress.status === 'polling' && (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Getting reviews from TripAdvisor...
            </>
          )}
          {importProgress.status === 'continuing' && (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing additional reviews...
            </>
          )}
          {importProgress.status === 'completed' && (
            <>
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              Import completed successfully!
            </>
          )}
        </div>
      </div>
    )
  }

  if (isLoadingProfile) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">TripAdvisor</h3>
              <p className="text-gray-600">Loading integration...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Globe className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-semibold">TripAdvisor</h3>
                <Badge className={`${profile?.tripadvisor_reviews_total_count > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {profile?.tripadvisor_reviews_total_count > 0 ? 'Connected' : 'Not Connected'}
                </Badge>
                {isUrlLocked && (
                  <Badge className="bg-blue-100 text-blue-800">
                    <Lock className="w-3 h-3 mr-1" />
                    Locked
                  </Badge>
                )}
              </div>
              <p className="text-gray-600">
                Import and manage reviews from TripAdvisor for your business
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        {profile?.tripadvisor_reviews_total_count > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {profile.tripadvisor_reviews_imported_count || 0}
              </div>
              <div className="text-sm text-gray-600">Reviews Imported</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {profile.tripadvisor_reviews_total_count || 0}
              </div>
              <div className="text-sm text-gray-600">Total Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {profile.tripadvisor_reviews_total_count > 0 
                  ? Math.round((profile.tripadvisor_reviews_imported_count / profile.tripadvisor_reviews_total_count) * 100)
                  : 0}%
              </div>
              <div className="text-sm text-gray-600">Completion</div>
            </div>
          </div>
        )}

        {/* URL Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              TripAdvisor Reviews URL
              {isUrlLocked && (
                <span className="ml-2 text-blue-600 text-xs">(URL is locked after successful import)</span>
              )}
            </label>
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Input
                  type="url"
                  placeholder="https://www.tripadvisor.com/Attraction_Review-..."
                  value={tripadvisorUrl}
                  onChange={handleUrlChange}
                  disabled={isLoading || isUrlLocked}
                  className={isUrlLocked ? 'bg-gray-50 cursor-not-allowed' : ''}
                />
                {isUrlLocked && (
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                )}
              </div>
              
              {isUrlLocked ? (
                <Button
                  variant="outline"
                  onClick={handleUnlockUrl}
                  size="sm"
                  className="flex items-center"
                >
                  <Unlock className="w-4 h-4 mr-1" />
                  Unlock
                </Button>
              ) : (
                <Button
                  onClick={handleImport}
                  disabled={isLoading || !tripadvisorUrl}
                  className="flex items-center bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Connect & Import All
                    </>
                  )}
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Paste your business's TripAdvisor reviews page URL to automatically import all reviews
            </p>
          </div>

          {/* Progress */}
          {renderProgressBar()}

          {/* Alerts */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Nightly Sync Info */}
          {profile?.tripadvisor_reviews_total_count > 0 && isUrlLocked && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900">Automatic Nightly Sync</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Your TripAdvisor reviews will be automatically checked for new reviews every night. 
                    {profile.last_nightly_sync && (
                      <> Last sync: {new Date(profile.last_nightly_sync).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">How to find your TripAdvisor URL:</h4>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Go to your business page on TripAdvisor</li>
              <li>Click on the "Reviews" tab</li>
              <li>Copy the URL from your browser's address bar</li>
              <li>Paste it above and click "Connect & Import All"</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TripAdvisorIntegration