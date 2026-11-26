"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { Button, Field, Input, Notice } from "@/components/ui";
import { cn } from "@/lib/format";
import { passwordAuth, sendMagicLink, type LoginState } from "./actions";

type Mode = "signin" | "signup" | "link";

export function LoginForm({ next, initialMode = "signin" }: { next: string; initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [show, setShow] = useState(false);
  const [linkState, linkAction, linkPending] = useActionState<LoginState, FormData>(sendMagicLink, undefined);
  const [pwState, pwAction, pwPending] = useActionState<LoginState, FormData>(passwordAuth, undefined);
  const sent = linkState?.sent ?? pwState?.sent;

  if (sent) {
    return (
      <div className="space-y-3 py-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
          <MailCheck className="h-7 w-7" aria-hidden />
        </span>
        <p className="font-display text-2xl">Check your email</p>
        <p className="text-sm text-muted">
          We sent a link to <strong className="text-ink">{sent}</strong>. Open it on this device to continue.
        </p>
      </div>
    );
  }

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => setMode(m)}
      className={cn("h-9 flex-1 rounded-lg text-sm font-semibold transition", mode === m ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex rounded-xl bg-black/[.05] p-1" role="tablist" aria-label="Sign in method">
        {tab("signin", "Sign in")}
        {tab("signup", "Create account")}
      </div>

      {mode === "link" ? (
        <form action={linkAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <Field label="Email address" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" />
          </Field>
          {linkState?.error ? <Notice tone="danger">{linkState.error}</Notice> : null}
          <Button type="submit" size="lg" className="w-full" disabled={linkPending}>
            {linkPending ? "Sending…" : "Email me a sign-in link"}
          </Button>
          <p className="text-center text-xs text-muted">No password needed. New here? The same link creates your account.</p>
        </form>
      ) : (
        <form action={pwAction} className="space-y-4" key={mode}>
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="mode" value={mode} />
          {mode === "signup" ? (
            <Field label="First name" htmlFor="name" hint="This is how we greet you. Only your first name is ever shown.">
              <Input id="name" name="name" autoComplete="given-name" maxLength={40} required />
            </Field>
          ) : null}
          <Field label="Email address" htmlFor="pw-email">
            <Input id="pw-email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" />
          </Field>
          <Field label="Password" htmlFor="password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={show ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={8}
                required
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-bg hover:text-ink"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>
          </Field>
          {pwState?.error ? <Notice tone="danger">{pwState.error}</Notice> : null}
          <Button type="submit" size="lg" className="w-full" disabled={pwPending}>
            {pwPending ? "Please wait…" : mode === "signup" ? "Create my account" : "Sign in"}
          </Button>
          {mode === "signup" ? (
            <p className="text-center text-xs text-muted">
              By creating an account you agree to our <a href="/terms" className="underline">terms</a> and <a href="/privacy" className="underline">privacy policy</a>.
            </p>
          ) : null}
        </form>
      )}

      <div className="relative text-center text-xs text-muted">
        <span className="absolute inset-x-0 top-1/2 h-px bg-line" aria-hidden />
        <span className="relative bg-surface px-3">or</span>
      </div>
      <button
        type="button"
        onClick={() => setMode(mode === "link" ? "signin" : "link")}
        className="flex h-11 w-full items-center justify-center rounded-xl border border-line text-sm font-semibold hover:border-ink/25"
      >
        {mode === "link" ? "Use email and password" : "Email me a one-time sign-in link"}
      </button>
    </div>
  );
}
