import { useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { 
  Image,
  Globe,
  Braces,
  FileCode,
  Database,
  Share2,
  Filter,
  Bot
} from 'lucide-react';
import DonutBotCrawler from './DonutBotCrawler';

// A selection of icons for the background animation
const bgIcons = [Database, Share2, Filter, Bot, FileCode, Globe, Image, Braces];

interface FloatingIconProps {
  index: number;
  mouseX: any;
  mouseY: any;
}

// Component for the individual floating icons with enhanced interactivity and depth
const FloatingIcon = ({ index, mouseX, mouseY }: FloatingIconProps) => {
  const Icon = bgIcons[index % bgIcons.length];
  
  const depth = Math.random() * 0.9 + 0.1;
  const parallaxFactor = depth * 0.1;
  const size = depth * 40 + 15;
  const initialOpacity = depth * 0.1 + 0.05;
  const scale = depth * 0.8 + 0.2;

  const x = useTransform(mouseX, (value: number) => (value - window.innerWidth / 2) * parallaxFactor);
  const y = useTransform(mouseY, (value: number) => (value - window.innerHeight / 2) * parallaxFactor);

  const duration = Math.random() * 20 + 15;
  const delay = Math.random() * 10;
  const initialY = Math.random() * 100;
  const initialX = Math.random() * 100;

  const variants = {
    initial: {
      top: `${initialY}vh`,
      left: `${initialX}vw`,
      opacity: 0,
      scale: scale,
    },
    animate: {
      opacity: [0, initialOpacity, initialOpacity, 0],
      rotate: [0, Math.random() * 90 - 45, 0],
      transition: {
        duration: duration,
        repeat: Infinity,
        repeatType: "mirror" as const,
        ease: "easeInOut",
        delay: delay,
      }
    }
  };

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      whileHover={{ scale: scale * 1.5, color: '#f0f0f0', opacity: 0.8, zIndex: 50 }}
      whileTap={{ scale: scale * 1.3 }}
      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
      className="absolute text-white/10"
      style={{ x, y, zIndex: Math.round(depth * 10) }}
    >
      <Icon style={{ width: size, height: size }} />
    </motion.div>
  );
};

const Hero = () => {
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

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.2 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } };
  const crawlerVariants = { hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] } } };

  return (
    <section className="relative min-h-screen w-full flex items-center justify-center py-20 bg-slate-900 overflow-hidden">
      {/* Container for all background effects */}
      <div className="absolute inset-0 z-0">
          <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-900"
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              style={{ backgroundSize: "400% 400%" }}
          />
          <motion.div
            className="pointer-events-none absolute -inset-px rounded-full"
            style={{
              background: useTransform(
                [mouseX, mouseY],
                ([x, y]) => `radial-gradient(400px at ${x}px ${y}px, rgba(147, 112, 219, 0.15), transparent 80%)`
              ),
            }}
          />
          <div className="absolute inset-0 pointer-events-none">
            <div 
              className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:36px_36px]"
              style={{
                maskImage: "radial-gradient(ellipse 80% 50% at 50% 0%,#000 70%,transparent 100%)"
              }}
            />
          </div>
          <motion.div
            className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-purple-600/30 rounded-full blur-3xl"
            animate={{ y: [0, 20, 0], x: [0, -20, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" }}
          />
          <motion.div
            className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-pink-600/30 rounded-full blur-3xl"
            animate={{ y: [0, -20, 0], x: [0, 20, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", repeatType: "mirror", delay: 5 }}
          />
      </div>

      <div className="absolute inset-0 w-full h-full">
        {Array.from({ length: 25 }).map((_, i) => (
          <FloatingIcon key={i} index={i} mouseX={mouseX} mouseY={mouseY} />
        ))}
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center lg:text-left"
          >
            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-200 via-white to-gray-200"
              style={{ backgroundSize: "200% auto" }}
              animate={{ backgroundPosition: ["0% center", "200% center", "0% center"]}}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            >
              <span className="block text-indigo-400">Donut-Bot</span>
              <span className="block">Web Crawler</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-4 text-lg text-gray-300 max-w-lg mx-auto lg:mx-0"
            >
              A powerful, production-ready web crawler with a modern tech stack for real-time data extraction.
            </motion.p>
            
            <motion.div
              variants={itemVariants}
              className="mt-8 flex justify-center lg:justify-start space-x-4"
            >
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transition-colors duration-300"
              >
                Get Started
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 bg-gray-700 text-white font-semibold rounded-lg shadow-lg hover:bg-gray-800 transition-colors duration-300"
              >
                View on GitHub
              </motion.button>
            </motion.div>
          </motion.div>
          
          <motion.div 
            variants={crawlerVariants}
            initial="hidden"
            animate="visible"
            className="relative h-[500px] flex items-center justify-center"
          >
            <DonutBotCrawler />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;