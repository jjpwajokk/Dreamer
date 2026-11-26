import { requireAdmin } from "@/lib/auth";

export const metadata = { title: { default: "Admin", template: "%s · Admin · Dreamer" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
