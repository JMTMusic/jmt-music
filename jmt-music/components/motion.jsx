"use client";

import { motion } from "framer-motion";

export function Reveal({ children, className = "", delay = 0 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function FloatingArtwork({ children, className = "" }) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -12, 4, 0], rotate: [0, 1, -0.5, 0] }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}
