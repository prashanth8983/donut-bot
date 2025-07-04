import { motion } from 'framer-motion';

const BackgroundAnimation = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      className="fixed top-0 left-0 w-full h-full z-[-1]"
    >
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900" />
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 40,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500 rounded-full opacity-20 blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, -180, -360],
        }}
        transition={{
          duration: 50,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500 rounded-full opacity-20 blur-3xl"
      />
    </motion.div>
  );
};

export default BackgroundAnimation;