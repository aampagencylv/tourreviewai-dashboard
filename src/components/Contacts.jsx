import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback } from './ui/avatar'
import { supabase } from '../lib/supabase'
import { Search, Filter, Upload, Download, UserPlus, Mail, Star, MapPin } from 'lucide-react'

const Contacts = () => {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({
    totalContacts: 0,
    googleCustomers: 0,
    tripadvisorCustomers: 0,
    avgRating: 0
  })

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      setLoading(true)
      
      // Fetch Google reviews
      const { data: googleReviews, error: googleError } = await supabase
        .from('google_reviews')
        .select('*')
        .order('review_datetime', { ascending: false })

      // Fetch TripAdvisor reviews  
      const { data: tripadvisorReviews, error: tripadvisorError } = await supabase
        .from('tripadvisor_reviews')
        .select('*')
        .order('review_datetime', { ascending: false })

      if (googleError) throw googleError
      if (tripadvisorError) throw tripadvisorError

      // Process contacts from reviews
      const contactsMap = new Map()

      // Process Google reviews
      googleReviews?.forEach(review => {
        const contactKey = review.author_name?.toLowerCase()
        if (contactKey && !contactsMap.has(contactKey)) {
          contactsMap.set(contactKey, {
            id: `google_${review.id}`,
            name: review.author_name,
            platform: 'google',
            rating: review.rating,
            reviewCount: 1,
            lastReview: review.review_datetime,
            location: review.author_location || '',
            avatar: review.author_name?.charAt(0)?.toUpperCase() || 'U'
          })
        }
      })

      // Process TripAdvisor reviews
      tripadvisorReviews?.forEach(review => {
        const contactKey = review.author?.toLowerCase()
        if (contactKey && !contactsMap.has(contactKey)) {
          contactsMap.set(contactKey, {
            id: `tripadvisor_${review.id}`,
            name: review.author,
            platform: 'tripadvisor',
            rating: review.rating,
            reviewCount: 1,
            lastReview: review.review_datetime,
            location: review.location || '',
            avatar: review.author?.charAt(0)?.toUpperCase() || 'U'
          })
        }
      })

      const contactsList = Array.from(contactsMap.values())
      setContacts(contactsList)

      // Calculate stats
      const totalContacts = contactsList.length
      const googleCustomers = contactsList.filter(c => c.platform === 'google').length
      const tripadvisorCustomers = contactsList.filter(c => c.platform === 'tripadvisor').length
      const avgRating = contactsList.length > 0 
        ? (contactsList.reduce((sum, c) => sum + c.rating, 0) / contactsList.length).toFixed(1)
        : 0

      setStats({
        totalContacts,
        googleCustomers,
        tripadvisorCustomers,
        avgRating: parseFloat(avgRating)
      })

    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.location?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit', 
      year: 'numeric' 
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600 mt-1">Manage your customer relationships and contact information</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContacts}</div>
            <p className="text-xs text-muted-foreground">Active customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Google Customers</CardTitle>
            <div className="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center">
              <span className="text-white text-xs font-bold">G</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.googleCustomers}</div>
            <p className="text-xs text-muted-foreground">From Google reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TripAdvisor Customers</CardTitle>
            <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center">
              <span className="text-white text-xs font-bold">T</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.tripadvisorCustomers}</div>
            <p className="text-xs text-muted-foreground">From TripAdvisor reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating}</div>
            <p className="text-xs text-muted-foreground">Customer satisfaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search contacts by name, email, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Contacts List */}
      <Card>
        <CardHeader>
          <CardTitle>All Contacts ({filteredContacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading contacts...</div>
          ) : (
            <div className="space-y-4">
              {filteredContacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarFallback className="bg-gray-200 text-gray-700">
                        {contact.avatar}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{contact.name}</h3>
                        <Badge 
                          variant={contact.platform === 'google' ? 'default' : 'secondary'}
                          className={contact.platform === 'google' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                        >
                          {contact.platform === 'google' ? 'Google' : 'TripAdvisor'}
                        </Badge>
                        <span className="text-sm text-gray-500">Customer</span>
                      </div>
                      {contact.location && (
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {contact.location}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < contact.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="ml-1 font-medium">{contact.rating}.0</span>
                      </div>
                      <div className="text-gray-500">{contact.reviewCount} review{contact.reviewCount !== 1 ? 's' : ''}</div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-gray-900">Last: {formatDate(contact.lastReview)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Contacts

