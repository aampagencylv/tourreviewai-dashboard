import React from 'react'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Dashboard />
      </main>
    </div>
  )
}

export default App

