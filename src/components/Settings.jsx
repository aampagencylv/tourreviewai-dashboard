import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { Switch } from './ui/switch'
import { Label } from './ui/label'
import GoogleBusinessIntegration from './GoogleBusinessIntegration'
import { 
  Building2, 
  Plug, 
  Phone, 
  Code, 
  Webhook, 
  Bell, 
  Users, 
  Shield,
  Save,
  RefreshCw,
  Settings as SettingsIcon,
  Unplug,
  CheckCircle,
  XCircle,
  Globe
} from 'lucide-react'

const Settings = () => {
  const [activeTab, setActiveTab] = useState('business-profile')
  const [businessProfile, setBusinessProfile] = useState({
    businessName: 'Las Vegas Slingshot Tours',
    website: 'https://lvslingshotours.com',
    contactEmail: 'info@lvslingshotours.com',
    contactPhone: '+1 (702) 555-0123',
    businessAddress: '123 Las Vegas Blvd, Las Vegas, NV 89101',
    businessDescription: 'Premier slingshot rental and tour company in Las Vegas'
  })

  const [integrations] = useState({
    googleMyBusiness: {
      connected: false,
      status: 'disconnected',
      features: ['Review Sync', 'Reply to Reviews', 'Profile Management', 'Analytics', 'OAuth Authentication'],
      lastSync: null
    },
    tripadvisor: {
      connected: true,
      status: 'active',
      features: ['Review Import', 'Bulk Sync', 'Real-time Updates', 'Response Management'],
      lastSync: 'Jan 15, 2024, 10:25 AM',
      reviewCount: 150
    },
    twilio: {
      connected: false,
      status: 'disconnected',
      features: ['SMS Campaigns', 'Phone Integration', 'Automated Requests', 'Two-way Messaging']
    },
    yelp: {
      connected: false,
      status: 'disconnected',
      features: ['Review Monitoring', 'Response Management', 'Business Profile', 'Analytics']
    }
  })

  const tabs = [
    { id: 'business-profile', label: 'Business Profile', icon: Building2 },
    { id: 'integrations', label: 'Integrations', icon: Plug },
    { id: 'phone', label: 'Phone', icon: Phone },
    { id: 'widgets', label: 'Widgets', icon: Code },
    { id: 'api-webhooks', label: 'API & Webhooks', icon: Webhook },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'security', label: 'Security', icon: Shield }
  ]

  const handleInputChange = (field, value) => {
    setBusinessProfile(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = () => {
    console.log('Saving settings...', businessProfile)
    // Here you would typically save to your backend/Supabase
  }

  const renderBusinessProfile = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="businessName">Business Name</Label>
          <Input
            id="businessName"
            value={businessProfile.businessName}
            onChange={(e) => handleInputChange('businessName', e.target.value)}
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={businessProfile.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input
            id="contactEmail"
            type="email"
            value={businessProfile.contactEmail}
            onChange={(e) => handleInputChange('contactEmail', e.target.value)}
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="contactPhone">Contact Phone</Label>
          <Input
            id="contactPhone"
            value={businessProfile.contactPhone}
            onChange={(e) => handleInputChange('contactPhone', e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="businessAddress">Business Address</Label>
        <Input
          id="businessAddress"
          value={businessProfile.businessAddress}
          onChange={(e) => handleInputChange('businessAddress', e.target.value)}
          className="mt-1"
        />
      </div>
      
      <div>
        <Label htmlFor="businessDescription">Business Description</Label>
        <Textarea
          id="businessDescription"
          value={businessProfile.businessDescription}
          onChange={(e) => handleInputChange('businessDescription', e.target.value)}
          className="mt-1"
          rows={4}
        />
      </div>
    </div>
  )

  const renderIntegrations = () => (
    <div className="space-y-6">
      {/* Google My Business - Real OAuth Integration */}
      <GoogleBusinessIntegration />

      {/* TripAdvisor */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Globe className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-semibold">TripAdvisor</h3>
                  <Badge className="bg-green-100 text-green-800">
                    {integrations.tripadvisor.status}
                  </Badge>
                </div>
                <p className="text-gray-600 mb-4">
                  Import and manage reviews from TripAdvisor for your business
                </p>
                
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-600">Connected</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Last sync: {integrations.tripadvisor.lastSync}
                  </div>
                </div>

                <div className="flex items-center space-x-6 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{integrations.tripadvisor.reviewCount}</div>
                    <div className="text-sm text-gray-500">reviews</div>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Features</h4>
                  <div className="flex flex-wrap gap-2">
                    {integrations.tripadvisor.features.map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </Button>
              <Button variant="outline" size="sm">
                <SettingsIcon className="w-4 h-4 mr-2" />
                Configure
              </Button>
              <Button variant="outline" size="sm">
                <Unplug className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Twilio */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <Phone className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-semibold">Twilio</h3>
                  <Badge className="bg-gray-100 text-gray-800">
                    {integrations.twilio.status}
                  </Badge>
                </div>
                <p className="text-gray-600 mb-4">
                  Send SMS review requests and manage phone communications
                </p>
                
                <div className="flex items-center space-x-2 mb-4">
                  <XCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Not Connected</span>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Features</h4>
                  <div className="flex flex-wrap gap-2">
                    {integrations.twilio.features.map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <Button>
                <Plug className="w-4 h-4 mr-2" />
                Connect Twilio
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Yelp */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Globe className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-semibold">Yelp</h3>
                  <Badge className="bg-gray-100 text-gray-800">
                    {integrations.yelp.status}
                  </Badge>
                </div>
                <p className="text-gray-600 mb-4">
                  Monitor and respond to Yelp reviews for your business
                </p>
                
                <div className="flex items-center space-x-2 mb-4">
                  <XCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Not Connected</span>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Features</h4>
                  <div className="flex flex-wrap gap-2">
                    {integrations.yelp.features.map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <Button>
                <Plug className="w-4 h-4 mr-2" />
                Connect Yelp
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderPlaceholderTab = (tabName) => (
    <div className="text-center py-12">
      <div className="text-gray-400 mb-4">
        <SettingsIcon className="w-12 h-12 mx-auto" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{tabName}</h3>
      <p className="text-gray-600">This section is coming soon.</p>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'business-profile':
        return renderBusinessProfile()
      case 'integrations':
        return renderIntegrations()
      case 'phone':
        return renderPlaceholderTab('Phone Settings')
      case 'widgets':
        return renderPlaceholderTab('Widgets')
      case 'api-webhooks':
        return renderPlaceholderTab('API & Webhooks')
      case 'notifications':
        return renderPlaceholderTab('Notifications')
      case 'team':
        return renderPlaceholderTab('Team Management')
      case 'security':
        return renderPlaceholderTab('Security Settings')
      default:
        return renderBusinessProfile()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Configure your review management system</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {renderTabContent()}
      </div>
    </div>
  )
}

export default Settings

