import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Mail, Eye, MousePointer, Star, Plus, QrCode, Link, BarChart3, MessageSquare, Smartphone } from 'lucide-react'

const Collect = () => {
  const [campaigns] = useState([
    {
      id: 1,
      name: 'Post-Tour Review Request',
      platform: 'google',
      status: 'active',
      type: 'EMAIL',
      description: 'Automatic review request sent after tour completion',
      created: 'Jan 15, 2024',
      sent: 245,
      reviews: 23,
      conversion: 9
    },
    {
      id: 2,
      name: 'QR Code - Reception Desk',
      platform: 'tripadvisor',
      status: 'active',
      type: 'QR',
      description: 'QR code displayed at reception for immediate feedback',
      created: 'Jan 10, 2024',
      sent: 0,
      reviews: 34,
      conversion: 0
    },
    {
      id: 3,
      name: 'SMS Follow-up Campaign',
      platform: 'google',
      status: 'paused',
      type: 'SMS',
      description: 'SMS sent 24 hours after tour completion',
      created: 'Jan 05, 2024',
      sent: 89,
      reviews: 8,
      conversion: 9
    }
  ])

  const stats = {
    totalSent: 334,
    openRate: 57,
    clickRate: 27,
    reviewsGenerated: 65
  }

  const getStatusColor = (status) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  }

  const getPlatformColor = (platform) => {
    return platform === 'google' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'EMAIL':
        return <Mail className="w-4 h-4" />
      case 'QR':
        return <QrCode className="w-4 h-4" />
      case 'SMS':
        return <MessageSquare className="w-4 h-4" />
      default:
        return <Mail className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Collect</h1>
          <p className="text-gray-600 mt-1">Create campaigns to collect more customer reviews</p>
        </div>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSent}</div>
            <p className="text-xs text-muted-foreground">Requests sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openRate}%</div>
            <p className="text-xs text-muted-foreground">{Math.round(stats.totalSent * stats.openRate / 100)} opened</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clickRate}%</div>
            <p className="text-xs text-muted-foreground">{Math.round(stats.totalSent * stats.clickRate / 100)} clicked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviews Generated</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.reviewsGenerated}</div>
            <p className="text-xs text-muted-foreground">19% conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Active Campaigns ({campaigns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="border rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getTypeIcon(campaign.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                        <Badge className={getPlatformColor(campaign.platform)}>
                          {campaign.platform}
                        </Badge>
                        <Badge className={getStatusColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 mb-2">{campaign.description}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Created: {campaign.created}</span>
                        <span>Type: {campaign.type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-8 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{campaign.sent}</div>
                      <div className="text-gray-500">Sent</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{campaign.reviews}</div>
                      <div className="text-gray-500">Reviews</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{campaign.conversion}%</div>
                      <div className="text-gray-500">conversion</div>
                    </div>

                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <QrCode className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Generate QR Code</h3>
                <p className="text-sm text-gray-600">Create QR codes for instant review collection</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Link className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Review Links</h3>
                <p className="text-sm text-gray-600">Get direct links to your review pages</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Campaign Analytics</h3>
                <p className="text-sm text-gray-600">View detailed performance metrics</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Collect

