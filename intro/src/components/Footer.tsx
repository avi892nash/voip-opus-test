import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-6xl mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Opus Codec Tutorial</h3>
            <p className="text-gray-400">Learn audio compression through interactive visualizations</p>
          </div>
          <div className="space-y-4">
            <h4 className="text-lg font-medium">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://opus-codec.org/" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Opus Official Site
                </a>
              </li>
              <li>
                <a href="https://tools.ietf.org/html/rfc6716" className="text-gray-400 hover:text-white transition-colors duration-200">
                  RFC 6716
                </a>
              </li>
              <li>
                <a href="https://github.com/xiph/opus" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Opus Source
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-lg font-medium">Project</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://github.com/your-repo" className="text-gray-400 hover:text-white transition-colors duration-200">
                  GitHub
                </a>
              </li>
              <li>
                <a href="#demo" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Interactive Demo
                </a>
              </li>
              <li>
                <a href="#p2p" className="text-gray-400 hover:text-white transition-colors duration-200">
                  P2P VoIP App
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-12 pt-8 text-center">
          <p className="text-gray-400">&copy; 2024 Opus Codec Tutorial. Built for educational purposes.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 