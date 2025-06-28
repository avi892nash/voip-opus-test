import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import './Navbar.css';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

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
      className={`navbar ${isScrolled ? 'scrolled' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container">
        <Link to="/" className="navbar-brand">
          <span className="brand-text">Opus</span>
          <span className="brand-subtitle">Tutorial</span>
        </Link>

        <div className={`navbar-menu ${isMobileMenuOpen ? 'active' : ''}`}>
          <button 
            className="nav-link"
            onClick={() => scrollToSection('basics')}
          >
            Audio Basics
          </button>
          <button 
            className="nav-link"
            onClick={() => scrollToSection('codec')}
          >
            Opus Codec
          </button>
          <button 
            className="nav-link"
            onClick={() => scrollToSection('demo')}
          >
            Interactive Demo
          </button>
          <button 
            className="nav-link"
            onClick={() => scrollToSection('p2p')}
          >
            P2P VoIP
          </button>
        </div>

        <button 
          className={`mobile-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </motion.nav>
  );
};

export default Navbar; 