import { motion } from "framer-motion";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingCardProps {
  hasHeader?: boolean;
  rows?: number;
  className?: string;
}

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

export const LoadingCard = ({ hasHeader = true, rows = 3, className }: LoadingCardProps) => (
  <Card className={className}>
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {hasHeader && (
        <CardHeader>
          <motion.div variants={itemVariants}>
            <Skeleton className="h-6 w-2/3 mb-2" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <Skeleton className="h-4 w-1/2" />
          </motion.div>
        </CardHeader>
      )}
      
      <CardContent className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <motion.div key={i} variants={itemVariants}>
            <Skeleton className="h-10 w-full" />
          </motion.div>
        ))}
      </CardContent>
    </motion.div>
  </Card>
);
