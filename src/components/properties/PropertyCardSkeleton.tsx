import { motion } from 'framer-motion';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/animations/Skeleton';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 100, damping: 15 },
  },
};

export const PropertyCardSkeleton = () => (
  <motion.div
    className="bg-white rounded-xl shadow-md overflow-hidden"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <Skeleton variant="card" />
    <div className="p-4 space-y-3">
      <Skeleton variant="default" className="h-6" />
      <Skeleton variant="text" />
      <div className="flex gap-4">
        <Skeleton variant="default" className="h-4 w-16" />
        <Skeleton variant="default" className="h-4 w-16" />
        <Skeleton variant="default" className="h-4 w-16" />
      </div>
      <Skeleton variant="default" className="h-8 w-32" />
    </div>
  </motion.div>
);
