import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import AuthWrapper from './components/AuthWrapper'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import Contacts from './components/Contacts'
import Collect from './components/Collect'
import Settings from './components/Settings'
import AuthCallback from './pages/AuthCallback'
import './App.css'

function AppContent({ user, onSignOut }) {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header user={user} onSignOut={onSignOut} />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/collect" element={<Collect />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

function App() {
  return (
    <AuthWrapper>
      <AppContent />
    </AuthWrapper>
  )
}

export default App

