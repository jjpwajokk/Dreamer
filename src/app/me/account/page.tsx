import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Button, Card, PageTitle } from "@/components/ui";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await requireUser("/me/account");
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <PageTitle title="Account" subtitle={session.email ?? undefined} />
      <div className="mb-6 grid grid-cols-3 gap-2 text-center text-sm font-medium">
        <Link href="/me" className="rounded-xl border border-line bg-surface px-2 py-3 hover:bg-bg">My giving</Link>
        <Link href="/me/needs" className="rounded-xl border border-line bg-surface px-2 py-3 hover:bg-bg">My needs</Link>
        <Link href="/me/saved" className="rounded-xl border border-line bg-surface px-2 py-3 hover:bg-bg">Saved</Link>
      </div>
      <Card className="p-5">
        <ProfileForm profile={session.profile} />
      </Card>
      <form action="/auth/signout" method="post" className="mt-6">
        <Button variant="secondary" className="w-full" type="submit">Sign out</Button>
      </form>
      <p className="mt-6 text-center text-xs text-muted">
        Want your data deleted? Email us from this address and we&apos;ll remove it, as described in our <Link href="/privacy" className="underline">privacy policy</Link>.
      </p>
    </div>
  );
}
