export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#0e5e4e" />
      <circle cx="32" cy="40" r="14" fill="#f2a93b" />
      <rect x="8" y="40" width="48" height="16" fill="#0e5e4e" />
      <path d="M14 44h36" stroke="#fbf7f0" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 14v6M18 20l4 4M46 20l-4 4" stroke="#f2a93b" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
