import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const Footer = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const footerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <footer ref={ref} className="bg-gray-800 text-white py-12 relative z-30">
      <motion.div
        variants={footerVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        transition={{ duration: 0.8 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold">Donut-Bot</h3>
            <p className="mt-2 text-gray-400">
              A modern, powerful, and scalable web crawler.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Quick Links</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="#features" className="hover:text-indigo-400">Features</a></li>
              <li><a href="/dashboard" className="hover:text-indigo-400">Dashboard</a></li>
              <li><a href="/jobs" className="hover:text-indigo-400">Jobs</a></li>
              <li><a href="/docs" className="hover:text-indigo-400">API Docs</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Connect</h3>
            <div className="mt-4 flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white"><i className="fab fa-github"></i></a>
              <a href="#" className="text-gray-400 hover:text-white"><i className="fab fa-twitter"></i></a>
              <a href="#" className="text-gray-400 hover:text-white"><i className="fab fa-linkedin"></i></a>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-700 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Donut-Bot. All rights reserved.</p>
        </div>
      </motion.div>
    </footer>
  );
};

export default Footer;