import React from 'react';
import { motion } from 'framer-motion';

const P2PVoIP: React.FC = () => {
  return (
    <section id="p2p" className="section">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          Peer-to-Peer IPv6 VoIP
        </motion.h2>
        
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mt-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-gray-800">Direct Connection Without Servers</h3>
            <p className="text-lg text-gray-600">
              Learn how to build a VoIP application that connects two devices directly using IPv6, eliminating the need for central servers.
            </p>
            
            <div className="flex items-center justify-center space-x-8 py-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-3xl mb-2">
                  📱
                </div>
                <div className="text-sm font-medium text-gray-700">Device A</div>
              </div>
              <div className="flex-1 h-0.5 bg-primary-500 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 animate-pulse"></div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-3xl mb-2">
                  💻
                </div>
                <div className="text-sm font-medium text-gray-700">Device B</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <h4 className="text-xl font-semibold text-gray-800 mb-4">Try the P2P VoIP App</h4>
            <p className="text-gray-600 mb-6">
              Download and test the peer-to-peer voice calling application
            </p>
            <div className="flex gap-4 flex-wrap">
              <button className="btn btn-primary">Download App</button>
              <button className="btn btn-secondary">View Source Code</button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default P2PVoIP; 