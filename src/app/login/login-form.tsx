"use client";

import { useActionState, useState } from "react";
import { MailCheck } from "lucide-react";
import { Button, Field, Input, Notice } from "@/components/ui";
import { passwordAuth, sendMagicLink, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"link" | "signin" | "signup">("link");
  const [linkState, linkAction, linkPending] = useActionState<LoginState, FormData>(sendMagicLink, undefined);
  const [pwState, pwAction, pwPending] = useActionState<LoginState, FormData>(passwordAuth, undefined);
  const sent = linkState?.sent ?? pwState?.sent;

  if (sent) {
    return (
      <div className="space-y-3 text-center">
        <MailCheck className="mx-auto h-10 w-10 text-brand" aria-hidden />
        <p className="font-display text-xl font-semibold">Check your email</p>
        <p className="text-sm text-muted">
          We sent a sign-in link to <strong>{sent}</strong>. Open it on this phone to continue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {mode === "link" ? (
        <form action={linkAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <Field label="Email address" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" />
          </Field>
          {linkState?.error ? <Notice tone="danger">{linkState.error}</Notice> : null}
          <Button type="submit" className="w-full" disabled={linkPending}>
            {linkPending ? "Sending…" : "Email me a sign-in link"}
          </Button>
          <p className="text-center text-xs text-muted">No password needed. New here? The same link creates your account.</p>
        </form>
      ) : (
        <form action={pwAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="mode" value={mode} />
          <Field label="Email address" htmlFor="pw-email">
            <Input id="pw-email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Password" htmlFor="password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={8}
              required
            />
          </Field>
          {pwState?.error ? <Notice tone="danger">{pwState.error}</Notice> : null}
          <Button type="submit" className="w-full" disabled={pwPending}>
            {pwPending ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>
      )}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
        {mode !== "link" ? (
          <button className="text-brand underline-offset-2 hover:underline" onClick={() => setMode("link")}>Use an email link instead</button>
        ) : null}
        {mode !== "signin" ? (
          <button className="text-brand underline-offset-2 hover:underline" onClick={() => setMode("signin")}>Sign in with a password</button>
        ) : null}
        {mode !== "signup" ? (
          <button className="text-brand underline-offset-2 hover:underline" onClick={() => setMode("signup")}>Create an account with a password</button>
        ) : null}
      </div>
    </div>
  );
}
