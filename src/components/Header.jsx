import React from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Button } from './ui/button'

const Header = () => {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/contacts', label: 'Contacts' },
    { path: '/collect', label: 'Collect' },
    { path: '/settings', label: 'Settings' }
  ]

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link to="/" className="text-xl font-bold text-blue-600">
                ReviewFlow
              </Link>
            </div>
            
            {/* Navigation */}
            <nav className="flex space-x-8">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    isActive
                      ? "bg-blue-100 text-blue-700 px-3 py-2 rounded-md text-sm font-medium"
                      : "text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right side - Sign Out */}
          <div className="flex items-center">
            <Button variant="outline" size="sm">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header

