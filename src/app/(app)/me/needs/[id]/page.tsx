import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBanks } from "@/lib/banks";
import type { Institution, Need } from "@/lib/types";
import { PageTitle } from "@/components/ui";
import { NeedForm } from "../need-form";
import { needFormExtras } from "@/lib/need-form-extras";

export const metadata: Metadata = { title: "Edit need" };

export default async function EditNeedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser(`/me/needs/${id}`);
  const supabase = await createClient();
  const { data: need } = await supabase.from("needs").select("*").eq("id", id).maybeSingle();
  if (!need) notFound();
  if (!["draft", "needs_info"].includes(need.status)) redirect("/me/needs");
  const [{ data: institution }, { data: documents }, banks] = await Promise.all([
    need.institution_id ? supabase.from("institutions").select("*").eq("id", need.institution_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("need_documents").select("id, kind, file_name").eq("need_id", id).order("created_at"),
    getBanks(),
  ]);
  const extras = await needFormExtras(session.userId, session.profile, id, need.personal_payee_id ?? null);
  // Organisation needs keep their org's account as the payee.
  const inst = institution && (institution as Institution).type === "organisation" ? null : institution;
  return (
    <div className="mx-auto max-w-xl">
      <PageTitle title={need.status === "needs_info" ? "Add the missing information" : "Continue your need"} />
      <NeedForm
        need={need as Need}
        institution={(inst as Institution) ?? null}
        documents={documents ?? []}
        banks={banks}
        extras={extras}
      />
    </div>
  );
}
