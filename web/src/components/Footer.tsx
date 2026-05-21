import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white py-12 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
          <div className="space-y-3">
            <h3 className="text-xl font-semibold">VoIP + Opus</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              An interactive guide to internet voice calls — learn how it works, try it, and call
              someone.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="text-base font-medium">Read more</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://opus-codec.org/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Opus official site
                </a>
              </li>
              <li>
                <a
                  href="https://tools.ietf.org/html/rfc6716"
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  RFC 6716 (Opus spec)
                </a>
              </li>
              <li>
                <a
                  href="https://webrtc.org/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  WebRTC.org
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-base font-medium">Inside the site</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/learn" className="text-gray-400 hover:text-white transition-colors">
                  Learn
                </Link>
              </li>
              <li>
                <Link to="/demo" className="text-gray-400 hover:text-white transition-colors">
                  Interactive demo
                </Link>
              </li>
              <li>
                <Link to="/call" className="text-gray-400 hover:text-white transition-colors">
                  Make a call
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-10 pt-6 text-center text-gray-500 text-xs">
          Built as an open educational project.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
