import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getBanks } from "@/lib/banks";
import { healthcareEnabled } from "@/lib/config";
import { PageTitle } from "@/components/ui";
import { NeedForm } from "../need-form";

export const metadata: Metadata = { title: "Post a need" };

export default async function NewNeedPage() {
  await requireUser("/me/needs/new");
  const banks = await getBanks();
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <PageTitle title="Post a need" subtitle="It takes about 5 minutes. Every need is checked by our team before it goes live, usually within 48 hours." />
      <NeedForm need={null} institution={null} documents={[]} banks={banks} healthcareEnabled={healthcareEnabled()} />
    </div>
  );
}
