import type { Metadata } from "next";

export const metadata: Metadata = { title: "Account closed", robots: { index: false } };

export default function AccountClosed() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="font-display text-3xl">This account is closed</h1>
      <p className="mt-3 text-muted">
        To keep Dreamer safe for everyone, this account can no longer be used. If you believe this is a mistake, email us from the address on
        the account and our team will look at it with care.
      </p>
      <form action="/auth/signout" method="post" className="mt-8">
        <button type="submit" className="h-11 rounded-xl border border-line bg-surface px-5 text-sm font-semibold hover:border-ink/20">Sign out</button>
      </form>
    </div>
  );
}
