import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Image,
  Globe,
  Braces,
  FileCode,
  Database,
  FileText,
  Activity,
  Terminal
} from 'lucide-react';

interface Particle {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

interface DataLine {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

// The main DonutBotCrawler component with the requested ray animation
const DonutBotCrawler = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [dataLines, setDataLines] = useState<DataLine[]>([]);
  const [showOutputs, setShowOutputs] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const isAnimatingRef = React.useRef(false);

  const resourceNodes = [
    { id: 'pdf', icon: FileText, label: 'PDF', color: 'from-red-400 to-red-600' },
    { id: 'html', icon: FileCode, label: 'HTML', color: 'from-orange-400 to-orange-600' },
    { id: 'images', icon: Image, label: 'Images', color: 'from-green-400 to-green-600' },
    { id: 'api', icon: Globe, label: 'API', color: 'from-purple-400 to-purple-600' }
  ];

  const outputNodes = [
    { id: 'kafka', icon: Activity, label: 'Kafka', color: 'from-purple-500 to-pink-500' },
    { id: 'json', icon: Braces, label: 'JSON', color: 'from-blue-500 to-cyan-500' },
    { id: 'elastic', icon: Database, label: 'Elastic', color: 'from-yellow-500 to-orange-500' },
    { id: 'python', icon: Terminal, label: 'Python', color: 'from-green-500 to-teal-500' }
  ];

  const startAnimation = useCallback(() => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    
    setShowOutputs(false);
    setParticles([]);
    setDataLines([]);
    setProcessingStage(0);

    const totalDuration = (resourceNodes.length * 600) + 1000 + 2000 + (outputNodes.length * 300) + 2000 + 1000;

    resourceNodes.forEach((node, index) => {
      setTimeout(() => {
        const line = {
          id: `line-in-${node.id}`,
          from: { x: 25, y: 20 + index * 20 },
          to: { x: 50, y: 50 }
        };
        setDataLines(prev => [...prev, line]);

        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            const particle = {
              id: `${node.id}-${i}-${Date.now()}`,
              from: { x: 25, y: 20 + index * 20 },
              to: { x: 50, y: 50 }
            };
            setParticles(prev => [...prev, particle]);
            
            setTimeout(() => {
              setParticles(prev => prev.filter(p => p.id !== particle.id));
            }, 1500);
          }, i * 200);
        }
      }, index * 600);
    });

    const processingDelay = resourceNodes.length * 600 + 1000;
    setTimeout(() => {
      setProcessingStage(1);
      setTimeout(() => setProcessingStage(2), 1000);
      setTimeout(() => {
        setProcessingStage(0);
        setDataLines([]);
      }, 2000);
    }, processingDelay);

    setTimeout(() => {
      setShowOutputs(true);
      outputNodes.forEach((node, index) => {
        setTimeout(() => {
          const line = {
            id: `line-out-${node.id}`,
            from: { x: 50, y: 50 },
            to: { x: 75, y: 20 + index * 20 }
          };
          setDataLines(prev => [...prev, line]);

          for (let i = 0; i < 5; i++) {
            setTimeout(() => {
              const particle = {
                id: `out-${node.id}-${i}-${Date.now()}`,
                from: { x: 50, y: 50 },
                to: { x: 75, y: 20 + index * 20 }
              };
              setParticles(prev => [...prev, particle]);
              
              setTimeout(() => {
                setParticles(prev => prev.filter(p => p.id !== particle.id));
              }, 1500);
            }, i * 200);
          }
        }, index * 300);
      });

      setTimeout(() => {
        setDataLines([]);
        isAnimatingRef.current = false;
      }, outputNodes.length * 300 + 2000);
    }, processingDelay + 2500);

    return totalDuration;
  }, []);

  useEffect(() => {
    let animationTimeout: ReturnType<typeof setTimeout>;
    const runAnimation = () => {
      const duration = startAnimation();
      if (duration) {
        animationTimeout = setTimeout(runAnimation, duration + 1000);
      }
    };
    const initialTimeout = setTimeout(runAnimation, 1500);
    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(animationTimeout);
    }
  }, [startAnimation]);

  const floatAnimation = (index: number) => ({
    y: [0, -15, 0],
    x: [0, 5, 0],
    transition: { duration: 3 + index * 0.5, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }
  });

  return (
    <div className="relative h-full w-full flex items-center justify-between">
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="1" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>
          <AnimatePresence>
            {dataLines.map((line) => (
              <motion.line
                key={line.id}
                x1={`${line.from.x}%`} y1={`${line.from.y}%`}
                x2={`${line.from.x}%`} y2={`${line.from.y}%`}
                stroke="url(#lineGradient)"
                strokeWidth="3"
                strokeDasharray="10 5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ x2: `${line.to.x}%`, y2: `${line.to.y}%`, pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: "easeInOut" }}
              >
                <motion.animate
                  attributeName="stroke-dashoffset"
                  from="15" to="0" dur="0.5s"
                  repeatCount="indefinite"
                />
              </motion.line>
            ))}
          </AnimatePresence>
      </svg>

      <div className="w-1/4 space-y-6">
        {resourceNodes.map((node, index) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + index * 0.1, duration: 0.6 }}
            className="flex items-center justify-center"
          >
            <motion.div animate={floatAnimation(index)} whileHover={{ scale: 1.15, rotate: 10 }} className="relative group cursor-pointer">
              <div className={`absolute inset-0 bg-gradient-to-r ${node.color} rounded-full blur-xl opacity-50 group-hover:opacity-80 transition-opacity`} />
              <div className="relative w-20 h-20 bg-white/10 backdrop-blur-md rounded-full border-2 border-white/20 flex items-center justify-center group-hover:border-white/40 transition-all">
                <node.icon className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-white/80 whitespace-nowrap">{node.label}</span>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>

      <div className="relative flex-1 flex items-center justify-center">
        <motion.div className="relative w-48 h-48 z-20" animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
          {/* Main Donut Body and all its attached animations */}
          <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="w-full h-full rounded-full bg-gradient-to-br from-pink-500 to-purple-600 shadow-2xl relative flex items-center justify-center"
                animate={{ boxShadow: ["0 0 60px rgba(236, 72, 153, 0.6)", "0 0 80px rgba(168, 85, 247, 0.8)", "0 0 60px rgba(236, 72, 153, 0.6)"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-slate-900 rounded-full shadow-inner overflow-hidden">
                    <AnimatePresence>
                        {processingStage > 0 && (
                            <motion.div 
                                className="absolute top-0 left-0 w-full h-1 bg-cyan-300/50"
                                initial={{y: '-100%'}}
                                animate={{y: '100%'}}
                                exit={{opacity: 0}}
                                transition={{duration: 0.7, repeat: Infinity, ease: 'linear'}}
                            />
                        )}
                    </AnimatePresence>
                </div>
                <div className="absolute top-16 left-1/2 -translate-x-1/2 flex gap-8">
                  <motion.div className="w-5 h-5 bg-white rounded-full shadow-lg relative overflow-hidden" animate={{ scaleY: [1, 0.1, 1] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.95, 1] }}>
                    <motion.div className="absolute top-1 left-1 w-3 h-3 bg-slate-800 rounded-full" animate={{ x: [-1, 1, -1] }} transition={{ duration: 3, repeat: Infinity }} />
                  </motion.div>
                  <motion.div className="w-5 h-5 bg-white rounded-full shadow-lg relative overflow-hidden" animate={{ scaleY: [1, 0.1, 1] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.95, 1] }}>
                    <motion.div className="absolute top-1 left-1 w-3 h-3 bg-slate-800 rounded-full" animate={{ x: [-1, 1, -1] }} transition={{ duration: 3, repeat: Infinity }} />
                  </motion.div>
                </div>
                 <AnimatePresence>
                    {processingStage > 0 && (
                        <motion.div 
                            className="absolute inset-0 rounded-full bg-purple-500"
                            initial={{scale: 0, opacity: 0}}
                            animate={{scale: [1, 1.1, 1], opacity: [0, 0.4, 0]}}
                            exit={{opacity: 0}}
                            transition={{duration: 1, repeat: Infinity}}
                        />
                    )}
                 </AnimatePresence>
              </motion.div>
              
              <motion.div
                  className="absolute inset-0"
                  animate={{rotate: 360}}
                  transition={{duration: 8, repeat: Infinity, ease: 'linear'}}
              >
                  <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 w-6 h-6 bg-cyan-400 rounded-full shadow-lg" />
              </motion.div>
              <motion.div
                  className="absolute inset-0"
                  animate={{rotate: -360}}
                  transition={{duration: 12, repeat: Infinity, ease: 'linear', delay: 0.5}}
              >
                  <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-5 h-5 bg-amber-400 rounded-full shadow-lg" />
              </motion.div>

              <AnimatePresence>
                {processingStage > 0 && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1.3, rotate: 360 }}
                      exit={{ opacity: 0, scale: 1.5 }}
                      transition={{ rotate: { duration: 1, repeat: Infinity, ease: "linear" }, scale: { duration: 0.5 }, opacity: { duration: 0.5 } }}
                      className="absolute w-full h-full rounded-full border-4 border-yellow-500 border-t-transparent"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 1.2 }}
                      animate={{ opacity: 1, scale: 1.2, rotate: -360 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ rotate: { duration: 1.5, repeat: Infinity, ease: "linear" }, scale: { duration: 0.5 }, opacity: { duration: 0.5 } }}
                      className="absolute w-full h-full rounded-full border-4 border-cyan-500 border-b-transparent"
                    />
                  </>
                )}
              </AnimatePresence>
          </div>
        </motion.div>

        <AnimatePresence>
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ left: `${particle.from.x}%`, top: `${particle.from.y}%`, scale: 0, opacity: 0 }}
              animate={{ left: `${particle.to.x}%`, top: `${particle.to.y}%`, scale: [0, 1.5, 0.5], opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute w-3 h-3 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50 -translate-x-1/2 -translate-y-1/2"
              style={{ zIndex: 10 }}
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="w-1/4 space-y-6">
        <AnimatePresence>
          {showOutputs && outputNodes.map((node, index) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, x: 50, scale: 0.5 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 50, scale: 0.5 }}
              transition={{ delay: index * 0.15, type: "spring", stiffness: 200, damping: 20 }}
              className="flex items-center justify-center"
            >
              <motion.div whileHover={{ scale: 1.15, rotate: -10 }} className="relative group cursor-pointer">
                <div className={`absolute inset-0 bg-gradient-to-r ${node.color} rounded-full blur-xl opacity-60 group-hover:opacity-90 transition-opacity`} />
                <div className={`relative w-20 h-20 bg-gradient-to-r ${node.color} rounded-full flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all`}>
                  <node.icon className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-white/80 whitespace-nowrap font-medium">{node.label}</span>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DonutBotCrawler;