import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: "default" | "card" | "text" | "circle";
}

export const Skeleton = ({ 
  className = "",
  variant = "default" 
}: SkeletonProps) => {
  const baseClass = "bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded";
  
  const variants = {
    default: "h-4 w-full",
    card: "h-64 w-full",
    text: "h-3 w-3/4",
    circle: "h-16 w-16 rounded-full"
  };

  return (
    <motion.div
      className={`${baseClass} ${variants[variant]} ${className}`}
      animate={{
        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "linear"
      }}
      style={{
        backgroundSize: "200% 100%"
      }}
    />
  );
};

