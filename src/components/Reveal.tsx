"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "static" | "hidden" | "shown";

/**
 * Fades + slides its children in when scrolled into view (IntersectionObserver).
 * Server HTML is fully visible (no opacity-0 before hydration, so LCP and
 * no-JS/slow-JS users are unaffected); only sections that start below the
 * fold are hidden and animated. Respects prefers-reduced-motion.
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("static");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let first = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (first) {
          first = false;
          // Already on screen at load: leave it as rendered.
          if (entry.isIntersecting) {
            io.disconnect();
            return;
          }
          setMode("hidden");
          return;
        }
        if (entry.isIntersecting) {
          setMode("shown");
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const motion =
    mode === "static"
      ? ""
      : `transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          mode === "shown" ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`;

  return (
    <div
      ref={ref}
      className={`${motion} ${className}`}
      style={mode === "shown" ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
