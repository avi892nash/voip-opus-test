import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const navItems = [
  { to: '/learn', label: 'Learn' },
  { to: '/demo', label: 'Demo' },
  { to: '/call', label: 'Call' },
];

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const close = () => setIsMobileMenuOpen(false);

  const handleLogout = () => {
    logout();
    close();
    navigate('/');
  };

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md backdrop-blur-sm"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <Link to="/" className="flex items-center space-x-2" onClick={close}>
            <span className="text-xl sm:text-2xl font-bold text-primary-600">VoIP</span>
            <span className="text-xs sm:text-sm text-gray-500 font-medium">+ Opus</span>
          </Link>

          <div className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                    isActive
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {user ? (
              <>
                <span className="ml-4 text-sm text-gray-500">@{user.username}</span>
                <button
                  onClick={handleLogout}
                  className="ml-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="ml-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-gray-50 transition-colors"
                >
                  Log in
                </NavLink>
                <NavLink
                  to="/signup"
                  className="ml-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                >
                  Sign up
                </NavLink>
              </>
            )}
          </div>

          <button
            className="md:hidden flex flex-col space-y-1.5 p-2"
            aria-label="Toggle menu"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
          >
            <span className="w-6 h-0.5 bg-gray-700"></span>
            <span className="w-6 h-0.5 bg-gray-700"></span>
            <span className="w-6 h-0.5 bg-gray-700"></span>
          </button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              className="md:hidden border-t border-gray-200 py-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex flex-col space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={close}
                    className={({ isActive }) =>
                      `px-4 py-3 rounded-lg font-medium transition-colors ${
                        isActive
                          ? 'text-primary-600 bg-primary-50'
                          : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
                <div className="pt-2 border-t border-gray-100 mt-2">
                  {user ? (
                    <>
                      <div className="px-4 py-2 text-sm text-gray-500">@{user.username}</div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 rounded-lg font-medium text-red-600 hover:bg-red-50"
                      >
                        Log out
                      </button>
                    </>
                  ) : (
                    <>
                      <NavLink
                        to="/login"
                        onClick={close}
                        className="block px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Log in
                      </NavLink>
                      <NavLink
                        to="/signup"
                        onClick={close}
                        className="block px-4 py-3 rounded-lg font-medium text-white bg-primary-600 hover:bg-primary-700 text-center"
                      >
                        Sign up
                      </NavLink>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navbar;
