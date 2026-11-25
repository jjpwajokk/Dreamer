import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBanks } from "@/lib/banks";
import { healthcareEnabled } from "@/lib/config";
import type { Institution, Need } from "@/lib/types";
import { PageTitle } from "@/components/ui";
import { NeedForm } from "../need-form";

export const metadata: Metadata = { title: "Edit need" };

export default async function EditNeedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/me/needs/${id}`);
  const supabase = await createClient();
  const { data: need } = await supabase.from("needs").select("*").eq("id", id).maybeSingle();
  if (!need) notFound();
  if (!["draft", "needs_info"].includes(need.status)) redirect("/me/needs");
  const [{ data: institution }, { data: documents }, banks] = await Promise.all([
    need.institution_id ? supabase.from("institutions").select("*").eq("id", need.institution_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("need_documents").select("id, kind, file_name").eq("need_id", id).order("created_at"),
    getBanks(),
  ]);
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <PageTitle title={need.status === "needs_info" ? "Add the missing information" : "Continue your need"} />
      <NeedForm
        need={need as Need}
        institution={(institution as Institution) ?? null}
        documents={documents ?? []}
        banks={banks}
        healthcareEnabled={healthcareEnabled()}
      />
    </div>
  );
}
