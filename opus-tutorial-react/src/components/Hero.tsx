import React from 'react';
import { motion } from 'framer-motion';
import './Hero.css';

const Hero: React.FC = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="hero">
      <div className="hero-container">
        <motion.div 
          className="hero-content"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.h1 
            className="hero-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Learn the <span className="highlight">Opus Codec</span><br />
            Through Visual Animation
          </motion.h1>
          
          <motion.p 
            className="hero-subtitle"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Master audio compression with interactive animations, pseudocode, and build a real peer-to-peer VoIP application
          </motion.p>
          
          <motion.div 
            className="hero-buttons"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <motion.button 
              className="btn btn-primary"
              onClick={() => scrollToSection('basics')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start Learning
            </motion.button>
            
            <motion.button 
              className="btn btn-secondary"
              onClick={() => scrollToSection('demo')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Try Demo
            </motion.button>
          </motion.div>
        </motion.div>
        
        <motion.div 
          className="hero-visual"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="animation-container">
            <div style={{ textAlign: 'center', color: 'white', fontSize: '1.2rem' }}>
              🎵 Audio Visualization
              <br />
              <small>Interactive animations coming soon...</small>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero; 