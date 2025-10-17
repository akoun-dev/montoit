import { motion } from 'framer-motion';

export const MorphingBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10 -z-10">
      {/* Circle morphing */}
      <motion.div
        className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-br from-primary to-secondary rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, 30, 0],
          rotate: [0, 90, 0]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Square morphing */}
      <motion.div
        className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-secondary to-primary blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -50, 0],
          y: [0, -30, 0],
          rotate: [0, -90, 0],
          borderRadius: ['30%', '50%', '30%']
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Third shape - triangle-ish */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-bl from-green-500/50 to-primary/50 blur-3xl"
        animate={{
          scale: [1, 1.15, 1],
          x: [-100, 0, -100],
          y: [-100, 0, -100],
          rotate: [0, 180, 0],
          borderRadius: ['40%', '60%', '40%']
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
};

