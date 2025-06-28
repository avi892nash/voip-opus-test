import React from 'react';
import { motion } from 'framer-motion';
import HeroAnimation from './HeroAnimation';

const Hero: React.FC = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="pt-36 pb-20 bg-gradient-to-br from-primary-500 to-secondary-500 text-white min-h-screen flex items-center -mt-20">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center px-8">
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.h1 
            className="text-5xl lg:text-6xl font-bold leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Learn the <span className="text-gradient">Opus Codec</span><br />
            Through Visual Animation
          </motion.h1>
          
          <motion.p 
            className="text-xl opacity-90 mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Master audio compression with interactive animations, pseudocode, and build a real peer-to-peer VoIP application
          </motion.p>
          
          <motion.div 
            className="flex gap-4 flex-wrap"
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
          className="flex justify-center items-center"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="w-80 h-80 lg:w-96 lg:h-96 rounded-2xl bg-white bg-opacity-10 backdrop-blur-sm shadow-2xl flex items-center justify-center overflow-hidden">
            <HeroAnimation />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero; 