import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getBanks } from "@/lib/banks";
import { PageTitle } from "@/components/ui";
import { NeedForm } from "../need-form";
import { needFormExtras } from "@/lib/need-form-extras";

export const metadata: Metadata = { title: "Share a need" };

export default async function NewNeedPage() {
  const session = await requireUser("/me/needs/new");
  const [banks, extras] = await Promise.all([getBanks(), needFormExtras(session.userId, session.profile, null, null)]);
  return (
    <div className="mx-auto max-w-xl">
      <PageTitle eyebrow="Get support" title="Share a need" subtitle="About 10 minutes. Have the invoice or quote ready. Every naira is held safely until our team has verified your need." />
      <NeedForm need={null} institution={null} documents={[]} banks={banks} extras={extras} />
    </div>
  );
}
