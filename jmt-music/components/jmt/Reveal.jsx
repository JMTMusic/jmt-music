"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./jmt.module.css";

export function Reveal({ as: Tag = "div", className = "", activeClassName, children, ...rest }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) { setInView(true); return; }
    const io = new IntersectionObserver(
      (entries) => { entries.forEach((entry) => { if (entry.isIntersecting) setInView(true); }); },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const activeCls = inView ? (activeClassName ?? styles.rvIn) : "";
  const baseCls = activeClassName ? "" : styles.rv;
  return (
    <Tag ref={ref} className={`${baseCls} ${activeCls} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
