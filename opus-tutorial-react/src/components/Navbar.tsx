import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <motion.nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white shadow-lg backdrop-blur-sm' 
          : 'bg-white bg-opacity-95 backdrop-blur-sm'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-6xl mx-auto px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary-500">Opus</span>
            <span className="text-sm text-gray-600 font-medium">Tutorial</span>
          </Link>

          <div className={`hidden md:flex items-center space-x-8 ${isMobileMenuOpen ? 'flex' : ''}`}>
            <button 
              className="text-gray-700 hover:text-primary-500 font-medium transition-colors duration-200"
              onClick={() => scrollToSection('basics')}
            >
              Audio Basics
            </button>
            <button 
              className="text-gray-700 hover:text-primary-500 font-medium transition-colors duration-200"
              onClick={() => scrollToSection('codec')}
            >
              Opus Codec
            </button>
            <button 
              className="text-gray-700 hover:text-primary-500 font-medium transition-colors duration-200"
              onClick={() => scrollToSection('demo')}
            >
              Interactive Demo
            </button>
            <button 
              className="text-gray-700 hover:text-primary-500 font-medium transition-colors duration-200"
              onClick={() => scrollToSection('p2p')}
            >
              P2P VoIP
            </button>
          </div>

          <button 
            className={`md:hidden flex flex-col space-y-1 p-2 ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="w-6 h-0.5 bg-gray-700 transition-all duration-300"></span>
            <span className="w-6 h-0.5 bg-gray-700 transition-all duration-300"></span>
            <span className="w-6 h-0.5 bg-gray-700 transition-all duration-300"></span>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div 
            className="md:hidden border-t border-gray-200 py-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="flex flex-col space-y-4">
              <button 
                className="text-gray-700 hover:text-primary-500 font-medium transition-colors duration-200 text-left"
                onClick={() => scrollToSection('basics')}
              >
                Audio Basics
              </button>
              <button 
                className="text-gray-700 hover:text-primary-500 font-medium transition-colors duration-200 text-left"
                onClick={() => scrollToSection('codec')}
              >
                Opus Codec
              </button>
              <button 
                className="text-gray-700 hover:text-primary-500 font-medium transition-colors duration-200 text-left"
                onClick={() => scrollToSection('demo')}
              >
                Interactive Demo
              </button>
              <button 
                className="text-gray-700 hover:text-primary-500 font-medium transition-colors duration-200 text-left"
                onClick={() => scrollToSection('p2p')}
              >
                P2P VoIP
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar; 