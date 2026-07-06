"use client";

import { motion } from "framer-motion";

export function Reveal({ children, className = "" }) {
  return <div className={className}>{children}</div>;
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
