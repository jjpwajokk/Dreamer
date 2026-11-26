import { useId } from "react";

/** Dreamer mark: a sunrise over the horizon, the moment a life turns. */
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0f9a72" />
          <stop offset="1" stopColor="#065a43" />
        </linearGradient>
        <linearGradient id={`sun-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#bg-${id})`} />
      <path d="M17 42a15 15 0 0 1 30 0Z" fill={`url(#sun-${id})`} />
      <path d="M12 42h40" stroke="#ecfdf5" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M20 49h24" stroke="#ecfdf5" strokeOpacity=".55" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M32 13v6M19.5 18.5l4 4M44.5 18.5l-4 4" stroke="#fde68a" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <Logo className="h-8 w-8" />
      <span className={`text-[19px] font-semibold tracking-[-0.03em] ${tone === "light" ? "text-white" : "text-ink"}`}>Dreamer</span>
    </span>
  );
}
