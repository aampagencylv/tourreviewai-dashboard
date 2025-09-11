import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Switch } from './ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { 
  Star, 
  MessageSquare, 
  TrendingUp,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [reviewsPerPage] = useState(10)

  const [reviewStats, setReviewStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    thisWeekReviews: 0,
    responseRate: 85,
    googleReviews: 0,
    tripAdvisorReviews: 0,
    totalExternal: 0,
    channelMix: {
      google: 0,
      tripadvisor: 0
    }
  })

  const [bestReviews, setBestReviews] = useState([])
  const [worstReviews, setWorstReviews] = useState([])
  const [allReviews, setAllReviews] = useState([])

  const [aiSettings, setAiSettings] = useState({
    enabled: true,
    tone: 'Professional',
    autoRespond: true,
    threshold: 4,
    template: 'Thank you for your feedback! We appreciate you taking the time to share your experience with us.'
  })

  useEffect(() => {
    fetchReviewData()
  }, [])

  const fetchReviewData = async () => {
    try {
      setLoading(true)

      // Fetch TripAdvisor reviews
      const { data: tripAdvisorReviews, error: tripError } = await supabase
        .from('tripadvisor_reviews')
        .select('*')
        .order('review_date', { ascending: false })

      // Fetch Google reviews
      const { data: googleReviews, error: googleError } = await supabase
        .from('google_reviews')
        .select('*')
        .order('review_date', { ascending: false })

      if (tripError) {
        console.error('TripAdvisor error:', tripError)
      }
      if (googleError) {
        console.error('Google error:', googleError)
      }

      // Normalize review data
      const normalizedTripAdvisor = (tripAdvisorReviews || []).map(review => ({
        id: review.id,
        author: review.author_name,
        rating: review.rating,
        text: review.review_text,
        date: review.review_date,
        source: 'tripadvisor',
        status: 'Pending'
      }))

      const normalizedGoogle = (googleReviews || []).map(review => ({
        id: review.id,
        author: review.author_name,
        rating: review.rating,
        text: review.review_text,
        date: review.review_date,
        source: 'google',
        status: 'Pending'
      }))

      const allReviewsData = [...normalizedTripAdvisor, ...normalizedGoogle]
        .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort newest first
      
      // Calculate stats
      const totalReviews = allReviewsData.length
      const averageRating = totalReviews > 0 
        ? (allReviewsData.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews)
        : 0

      // This week reviews (last 7 days)
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const thisWeekReviews = allReviewsData.filter(r => 
        new Date(r.date) > oneWeekAgo
      ).length

      const googleCount = normalizedGoogle.length
      const tripAdvisorCount = normalizedTripAdvisor.length
      const totalExternal = googleCount + tripAdvisorCount

      // Channel mix
      const channelMix = {
        google: googleCount,
        tripadvisor: tripAdvisorCount
      }

      // Best and worst reviews
      const bestReviewsData = allReviewsData
        .filter(r => r.rating >= 4 && r.text)
        .slice(0, 3)

      const worstReviewsData = allReviewsData
        .filter(r => r.rating < 4)
        .slice(0, 3)

      setReviewStats({
        totalReviews,
        averageRating: Math.round(averageRating),
        thisWeekReviews,
        responseRate: 85, // Mock data for now
        googleReviews: googleCount,
        tripAdvisorReviews: tripAdvisorCount,
        totalExternal,
        channelMix
      })

      setBestReviews(bestReviewsData)
      setWorstReviews(worstReviewsData)
      setAllReviews(allReviewsData)

    } catch (error) {
      console.error('Error fetching review data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    })
  }

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ))
  }

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1)
  }

  const displayedReviews = allReviews.slice(0, currentPage * reviewsPerPage)
  const hasMoreReviews = displayedReviews.length < allReviews.length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Track your review performance and business growth</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={fetchReviewData}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Import Google Reviews
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewStats.totalReviews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewStats.averageRating}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewStats.thisWeekReviews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewStats.responseRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Review Sources */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Google Reviews</CardTitle>
            <RefreshCw className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{reviewStats.googleReviews}</div>
            <p className="text-sm text-gray-600">
              {reviewStats.totalExternal > 0 
                ? Math.round((reviewStats.googleReviews / reviewStats.totalExternal) * 100)
                : 0}% of external • Live count
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">TripAdvisor Reviews</CardTitle>
            <RefreshCw className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{reviewStats.tripAdvisorReviews}</div>
            <p className="text-sm text-gray-600">
              {reviewStats.totalExternal > 0 
                ? Math.round((reviewStats.tripAdvisorReviews / reviewStats.totalExternal) * 100)
                : 0}% of external • Live count
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Total External Reviews</CardTitle>
            <BarChart3 className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{reviewStats.totalExternal}</div>
            <p className="text-sm text-gray-600">Combined from all sources</p>
          </CardContent>
        </Card>
      </div>

      {/* Channel Mix */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Channel Mix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="capitalize font-medium">Google</span>
                <span className="text-gray-600">{reviewStats.channelMix.google}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-blue-600"
                    style={{ 
                      width: `${reviewStats.totalExternal > 0 ? (reviewStats.channelMix.google / reviewStats.totalExternal) * 100 : 0}%` 
                    }}
                  />
                </div>
                <span className="text-sm text-gray-600">
                  {reviewStats.totalExternal > 0 
                    ? Math.round((reviewStats.channelMix.google / reviewStats.totalExternal) * 100)
                    : 0}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="capitalize font-medium">Tripadvisor</span>
                <span className="text-gray-600">{reviewStats.channelMix.tripadvisor}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-green-600"
                    style={{ 
                      width: `${reviewStats.totalExternal > 0 ? (reviewStats.channelMix.tripadvisor / reviewStats.totalExternal) * 100 : 0}%` 
                    }}
                  />
                </div>
                <span className="text-sm text-gray-600">
                  {reviewStats.totalExternal > 0 
                    ? Math.round((reviewStats.channelMix.tripadvisor / reviewStats.totalExternal) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best and Worst Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Best Reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <ThumbsUp className="h-5 w-5" />
              Best Reviews
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {bestReviews.map((review, index) => (
              <div key={index} className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{review.author}</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex">{renderStars(review.rating)}</div>
                    <Badge variant="outline">{review.source}</Badge>
                  </div>
                </div>
                <p className="text-gray-700 text-sm mb-2">{review.text}</p>
                <p className="text-xs text-gray-500">{formatDate(review.date)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Areas for Improvement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <ThumbsDown className="h-5 w-5" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {worstReviews.map((review, index) => (
              <div key={index} className="border-l-4 border-red-500 pl-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{review.author}</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex">{renderStars(review.rating)}</div>
                    <Badge variant="outline">{review.source}</Badge>
                  </div>
                </div>
                <p className="text-gray-700 text-sm mb-2">{review.text}</p>
                <p className="text-xs text-gray-500">{formatDate(review.date)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* AI Response Settings */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>AI Response Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Enable AI Response Generation</label>
            <Switch 
              checked={aiSettings.enabled}
              onCheckedChange={(checked) => setAiSettings(prev => ({ ...prev, enabled: checked }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Response Tone</label>
              <Select value={aiSettings.tone} onValueChange={(value) => setAiSettings(prev => ({ ...prev, tone: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Friendly">Friendly</SelectItem>
                  <SelectItem value="Casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Auto-respond threshold (stars)</label>
              <Select value={aiSettings.threshold.toString()} onValueChange={(value) => setAiSettings(prev => ({ ...prev, threshold: parseInt(value) }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3+ stars</SelectItem>
                  <SelectItem value="4">4+ stars</SelectItem>
                  <SelectItem value="5">5 stars only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Auto-respond to Reviews</label>
            <Switch 
              checked={aiSettings.autoRespond}
              onCheckedChange={(checked) => setAiSettings(prev => ({ ...prev, autoRespond: checked }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Response Template</label>
            <Textarea 
              value={aiSettings.template}
              onChange={(e) => setAiSettings(prev => ({ ...prev, template: e.target.value }))}
              placeholder="Enter your default response template..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Reviews Management */}
      <Card>
        <CardHeader>
          <CardTitle>Reviews Management</CardTitle>
          <p className="text-sm text-gray-600">{reviewStats.totalReviews} total</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Filters</h3>
              <Button variant="outline" size="sm" onClick={fetchReviewData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="space-y-3">
              {displayedReviews.map((review, index) => (
                <div key={review.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">{review.author?.charAt(0) || 'U'}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{review.author}</span>
                        <div className="flex">{renderStars(review.rating)}</div>
                        <Badge variant="outline">{review.source}</Badge>
                        <Badge variant="secondary">{review.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{formatDate(review.date)}</p>
                      {review.text && (
                        <p className="text-sm text-gray-800">{review.text}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">AI Response</Button>
                    <Button variant="outline" size="sm">Write Response</Button>
                    <Button variant="outline" size="sm">
                      Reply on {review.source}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {allReviews.length > 0 && (
              <div className="text-center pt-4 space-y-3">
                <p className="text-sm text-gray-600">
                  Showing {displayedReviews.length} of {reviewStats.totalReviews} reviews
                </p>
                {hasMoreReviews && (
                  <Button 
                    variant="outline" 
                    onClick={handleLoadMore}
                    className="w-full"
                  >
                    Load More Reviews
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard

