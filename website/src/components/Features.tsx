import React, { useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: 'fas fa-server',
    title: 'Redis-Based URL Frontier',
    description: 'Scalable URL queue management with Redis for high-performance crawling and distributed processing.'
  },
  {
    icon: 'fas fa-filter',
    title: 'Bloom Filter Deduplication',
    description: 'Memory-efficient URL deduplication using Bloom filters to prevent crawling the same pages multiple times.'
  },
  {
    icon: 'fas fa-shield-alt',
    title: 'Robots.txt Compliance',
    description: 'Automatic robots.txt parsing and compliance to respect website crawling policies and rate limits.'
  },
  {
    icon: 'fas fa-tachometer-alt',
    title: 'Rate Limiting',
    description: 'Configurable per-domain rate limiting to be respectful to target websites and avoid being blocked.'
  },
  {
    icon: 'fas fa-chart-line',
    title: 'Real-time Monitoring',
    description: 'Comprehensive metrics and monitoring with live dashboard showing crawl progress, errors, and performance.'
  },
  {
    icon: 'fas fa-code',
    title: 'RESTful API',
    description: 'Full HTTP API for crawler control, job management, and configuration with FastAPI and OpenAPI documentation.'
  },
  {
    icon: 'fas fa-clock',
    title: 'Job Scheduling',
    description: 'Advanced job scheduler with cron-like expressions for automated, recurring crawl jobs.'
  },
  {
    icon: 'fas fa-database',
    title: 'MongoDB Storage',
    description: 'Persistent job storage and metadata management with MongoDB for reliable data persistence.'
  },
  {
    icon: 'fas fa-network-wired',
    title: 'Async Architecture',
    description: 'Non-blocking I/O operations with asyncio for high-concurrency crawling and efficient resource usage.'
  },
  {
    icon: 'fas fa-cogs',
    title: 'Configurable Settings',
    description: 'Extensive configuration options for workers, depth limits, content types, and domain restrictions.'
  },
  {
    icon: 'fas fa-file-alt',
    title: 'Content Extraction',
    description: 'Intelligent HTML parsing with BeautifulSoup for extracting text, links, and metadata.'
  },
  {
    icon: 'fas fa-mobile-alt',
    title: 'React Dashboard',
    description: 'Modern web interface built with React and TypeScript for real-time crawler monitoring and control.'
  }
];

const FeatureCard = ({ feature }: { feature: Feature }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = ({ currentTarget, clientX, clientY }: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 100, damping: 15 }
    },
  };

  return (
    <motion.div
      variants={itemVariants}
      className="group relative overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-8"
      onMouseMove={handleMouseMove}
      whileHover={{ y: -6, scale: 1.02, transition: { type: 'spring', stiffness: 300 } }}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useTransform(
            [mouseX, mouseY],
            ([x, y]) => `radial-gradient(350px at ${x}px ${y}px, rgba(20, 184, 166, 0.15), transparent 80%)`
          ),
        }}
      />
      
      <div className="relative z-10">
        <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
          <i className={`${feature.icon} text-2xl`}></i>
        </div>
        <h3 className="mt-6 text-xl font-semibold text-white">{feature.title}</h3>
        <p className="mt-4 text-base text-gray-400">{feature.description}</p>
      </div>
    </motion.div>
  );
};

const Features = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <section id="features" className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-slate-900 via-cyan-900/50 to-slate-900"
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              style={{ backgroundSize: "400% 400%" }}
            />
            <motion.div
                className="pointer-events-none absolute -inset-px"
                style={{
                background: useTransform(
                    [mouseX, mouseY],
                    ([x, y]) => `radial-gradient(400px at ${x}px ${y}px, rgba(20, 184, 166, 0.1), transparent 80%)`
                ),
                }}
            />
            <div 
              className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:36px_36px]"
              style={{
                maskImage: "radial-gradient(ellipse 80% 50% at 50% 100%,#000 70%,transparent 100%)"
              }}
            />
             <motion.div
                className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-cyan-600/30 rounded-full blur-3xl"
                animate={{ y: [0, 20, 0], x: [0, -20, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" }}
            />
            <motion.div
                className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-teal-600/30 rounded-full blur-3xl"
                animate={{ y: [0, -20, 0], x: [0, 20, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", repeatType: "mirror", delay: 3 }}
            />
            <motion.div
                className="absolute top-1/3 left-1/4 w-1/4 h-1/4 bg-emerald-600/20 rounded-full blur-2xl"
                animate={{ y: [0, -15, 0], x: [0, 15, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", repeatType: "mirror", delay: 2 }}
            />
        </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Powerful Features, Built for Scale
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            A deep dive into the technical capabilities of Donut-Bot.
          </p>
        </div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;