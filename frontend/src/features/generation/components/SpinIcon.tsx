import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/** A rotating loader that holds still for users who prefer reduced motion (the adjacent text carries the meaning). */
export function SpinIcon({ size = 16 }: { size?: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.span
      aria-hidden="true"
      style={{ display: 'inline-flex' }}
      animate={reduceMotion ? undefined : { rotate: 360 }}
      transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}
    >
      <Loader2 size={size} />
    </motion.span>
  );
}
