import { Shimmer } from '@/components/ui/shimmer';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 100 },
  },
};

export const PropertyDetailSkeleton = () => (
  <motion.div 
    className="min-h-screen bg-background"
    variants={containerVariants}
    initial="hidden"
    animate="visible"
  >
    <div className="container mx-auto px-4 py-6 space-y-6">
      <motion.div variants={itemVariants}>
        <Shimmer className="h-96 w-full rounded-2xl" />
      </motion.div>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <motion.div variants={itemVariants}>
            <Shimmer className="h-8 w-3/4" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <Shimmer className="h-6 w-1/2" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <Shimmer className="h-32 w-full" />
          </motion.div>
        </div>
        <div className="space-y-4">
          <motion.div variants={itemVariants}>
            <Shimmer className="h-48 w-full rounded-xl" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <Shimmer className="h-12 w-full rounded-xl" />
          </motion.div>
        </div>
      </div>
    </div>
  </motion.div>
);

export const PageSkeleton = () => (
  <motion.div 
    className="container mx-auto px-4 py-20"
    variants={containerVariants}
    initial="hidden"
    animate="visible"
  >
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <motion.div key={i} variants={itemVariants}>
          <Card className="overflow-hidden">
            <Shimmer className="aspect-video rounded-none" />
            <CardHeader className="p-4 sm:p-6 pb-3">
              <Shimmer className="h-6 w-full mb-2" />
              <Shimmer className="h-8 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
              <Shimmer className="h-4 w-3/4" />
              <div className="flex gap-4">
                <Shimmer className="h-10 flex-1" />
                <Shimmer className="h-10 flex-1" />
                <Shimmer className="h-10 flex-1" />
              </div>
              <Shimmer className="h-10 w-full" />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  </motion.div>
);
