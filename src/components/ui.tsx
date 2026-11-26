import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "sun";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white shadow-[0_1px_0_rgba(255,255,255,.15)_inset,0_8px_20px_-10px_rgba(10,122,90,.7)] hover:bg-brand-dark",
  secondary: "bg-surface text-ink border border-line shadow-sm hover:border-ink/20 hover:bg-bg",
  ghost: "text-ink hover:bg-black/5",
  danger: "bg-danger text-white hover:opacity-90",
  sun: "bg-sun text-night hover:brightness-95",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-4.5 text-[15px]",
  lg: "h-12 px-6 text-[15px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-[-0.01em] transition active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none",
    variants[variant],
    sizes[size],
    extra,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

const fieldClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink shadow-[0_1px_2px_rgba(16,24,40,.04)] placeholder:text-muted/60 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldClass, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClass, "min-h-28", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(fieldClass, "h-11 appearance-none bg-surface", className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-muted">{hint}</p> : null}
      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,.04)]", className)} {...props} />;
}

export function Badge({ className, tone = "neutral", ...props }: ComponentProps<"span"> & { tone?: "neutral" | "brand" | "sun" | "danger" }) {
  const tones = {
    neutral: "bg-black/5 text-ink",
    brand: "bg-brand-soft text-brand",
    sun: "bg-sun-soft text-[#8a5a10]",
    danger: "bg-danger-soft text-danger",
  };
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}
      {...props}
    />
  );
}

export function Progress({ percent, className }: { percent: number; className?: string }) {
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-black/[.07]", className)}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-gradient-to-r from-brand via-[#12a37a] to-mint transition-[width] duration-700" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function Notice({ tone = "brand", children }: { tone?: "brand" | "sun" | "danger"; children: ReactNode }) {
  const tones = {
    brand: "bg-brand-soft text-brand border-brand/20",
    sun: "bg-sun-soft text-[#6e470b] border-sun/30",
    danger: "bg-danger-soft text-danger border-danger/20",
  };
  return <div className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone])}>{children}</div>;
}

export function PageTitle({
  title,
  subtitle,
  action,
  eyebrow,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</p> : null}
        <h1 className="font-display text-[28px] leading-tight text-ink sm:text-[32px]">{title}</h1>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-[15px] text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "brand" | "sun" | "danger";
}) {
  const tones = {
    neutral: "bg-black/[.04] text-ink",
    brand: "bg-brand-soft text-brand",
    sun: "bg-sun-soft text-[#8a5a10]",
    danger: "bg-danger-soft text-danger",
  };
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        {icon ? <span className={cn("grid h-8 w-8 place-items-center rounded-lg", tones[tone])}>{icon}</span> : null}
      </div>
      <p className="tabular mt-2 text-2xl font-semibold tracking-[-0.03em]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <Card className="px-6 py-10 text-center">
      <p className="font-display text-xl">{title}</p>
      {children ? <div className="mx-auto mt-2 max-w-sm text-sm text-muted">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
