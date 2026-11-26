import type { Metadata } from "next";
import { ThanksStatus } from "./thanks-status";

export const metadata: Metadata = { title: "Thank you" };

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string }> }) {
  const sp = await searchParams;
  const reference = sp.reference ?? sp.trxref ?? "";
  return (
    <div className="mx-auto max-w-md">
      <ThanksStatus reference={reference} />
    </div>
  );
}
