import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tips?: string[];
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  tips,
}: EmptyStateProps) => {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Icon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        </motion.div>
        
        <motion.h3 
          className="text-lg font-semibold mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {title}
        </motion.h3>
        
        <motion.p 
          className="text-muted-foreground mb-6 max-w-md mx-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          {description}
        </motion.p>
        
        {tips && tips.length > 0 && (
          <motion.div 
            className="bg-muted/50 rounded-lg p-4 mb-6 max-w-md mx-auto text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <p className="font-medium text-sm mb-2">💡 Getting Started:</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {tips.map((tip, index) => (
                <motion.li 
                  key={index} 
                  className="flex items-start gap-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + (index * 0.1), duration: 0.3 }}
                >
                  <span className="text-primary">•</span>
                  <span>{tip}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
        
        {actionLabel && onAction && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <Button onClick={onAction} size="lg" className="hover-scale">
              {actionLabel}
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
