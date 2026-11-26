import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log" };

export default async function AuditLog() {
  const admin = createAdminClient();
  const { data } = await admin.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
  const actorIds = [...new Set((data ?? []).map((a) => a.actor_id).filter(Boolean))] as string[];
  const { data: actors } = actorIds.length ? await admin.from("profiles").select("user_id, email").in("user_id", actorIds) : { data: [] };
  const who = (id: string | null) => (id ? (actors ?? []).find((a) => a.user_id === id)?.email ?? "user" : "system");
  return (
    <div>
      <PageTitle eyebrow="Admin" title="Audit log" subtitle="Every admin action and every money movement, newest first." />
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-bg text-left text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-4 py-2">When</th><th className="px-4 py-2">Who</th><th className="px-4 py-2">Action</th><th className="px-4 py-2">Details</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(data ?? []).map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap px-4 py-2 text-muted">{formatDate(a.created_at, true)} {new Date(a.created_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-4 py-2">{who(a.actor_id)}</td>
                <td className="px-4 py-2 font-medium">{a.action}</td>
                <td className="max-w-md truncate px-4 py-2 font-mono text-xs text-muted">{a.after ? JSON.stringify(a.after) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
