import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, PageTitle } from "@/components/ui";
import { UpdateForm } from "./update-form";

export const metadata: Metadata = { title: "Post an update" };

export default async function PostUpdatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/me/needs/${id}/update`);
  const supabase = await createClient();
  const { data: need } = await supabase.from("needs").select("id, display_name, category, status").eq("id", id).maybeSingle();
  if (!need) notFound();
  if (!["live", "funded", "paid_out", "completed"].includes(need.status)) redirect("/me/needs");
  return (
    <div className="mx-auto max-w-xl">
      <PageTitle title="Share what changed" subtitle="Progress photos, receipts and milestones. Your givers are notified, and it's the best way to say thank you." />
      <Card className="p-5">
        <UpdateForm needId={need.id} category={need.category} name={need.display_name} />
      </Card>
    </div>
  );
}
