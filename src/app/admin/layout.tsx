import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: { default: "Admin", template: "%s · Admin · Dreamer" } };

const tabs = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/needs?status=submitted", label: "Needs" },
  { href: "/admin/updates", label: "Updates" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/ledger", label: "Ledger" },
  { href: "/admin/audit", label: "Audit log" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <nav className="-mx-4 mb-6 flex gap-1 overflow-x-auto px-4" aria-label="Admin">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:bg-bg">
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
