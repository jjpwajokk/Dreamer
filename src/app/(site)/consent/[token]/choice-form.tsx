"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Shuffle } from "lucide-react";
import { Button, Notice } from "@/components/ui";
import { cn } from "@/lib/format";
import { chooseExpiryOption } from "./actions";

export function ChoiceForm({ token, current }: { token: string; current: "refund" | "redirect" | null }) {
  const [choice, setChoice] = useState<"refund" | "redirect">(current ?? "redirect");
  const [msg, setMsg] = useState<{ tone: "brand" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const options = [
    { value: "redirect" as const, Icon: Shuffle, title: "Move my gift to someone similar", text: "Our team picks another verified person with a similar need. You'll get their story by email." },
    { value: "refund" as const, Icon: RotateCcw, title: "Refund me", text: "We return the gift to the card or account you paid with. Refunds take 5 to 10 working days." },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {options.map(({ value, Icon, title, text }) => (
          <button
            key={value}
            type="button"
            onClick={() => setChoice(value)}
            aria-pressed={choice === value}
            className={cn(
              "flex items-start gap-4 rounded-2xl border p-4 text-left transition",
              choice === value ? "border-brand bg-brand-soft/60 ring-4 ring-brand/10" : "border-line bg-surface hover:border-ink/20",
            )}
          >
            <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", choice === value ? "bg-brand text-white" : "bg-bg text-muted")}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold">{title}</span>
              <span className="mt-0.5 block text-sm text-muted">{text}</span>
            </span>
          </button>
        ))}
      </div>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <Button
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await chooseExpiryOption(token, choice);
            setMsg(r.ok ? { tone: "brand", text: "Thank you. We've saved your choice and will email you when it's done." } : { tone: "danger", text: r.error ?? "Something went wrong." });
          })
        }
      >
        {pending ? "Saving…" : "Save my choice"}
      </Button>
    </div>
  );
}
