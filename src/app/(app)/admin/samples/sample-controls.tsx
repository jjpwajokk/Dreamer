"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { Button, Field, Input, Notice } from "@/components/ui";
import { removeSampleData, runSampleStep, setSamplePassword } from "./actions";

type StepState = { key: string; label: string; status: "todo" | "running" | "done" | "failed"; message?: string };

export function SampleLoader({ steps, loaded }: { steps: { key: string; label: string }[]; loaded: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [state, setState] = useState<StepState[]>(steps.map((s) => ({ ...s, status: "todo" })));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "brand" | "danger"; text: string } | null>(null);

  async function load() {
    setBusy(true);
    setNote(null);
    const next = steps.map((s) => ({ ...s, status: "todo" as const })) as StepState[];
    setState(next);
    for (let i = 0; i < steps.length; i++) {
      next[i] = { ...next[i], status: "running" };
      setState([...next]);
      const r = await runSampleStep(steps[i].key as never, i === 0 ? password : undefined);
      next[i] = { ...next[i], status: r.ok ? "done" : "failed", message: r.message };
      setState([...next]);
      if (!r.ok) {
        setNote({ tone: "danger", text: `Stopped at "${steps[i].label}". You can press the button again: steps already done are skipped.` });
        setBusy(false);
        return;
      }
    }
    setNote({ tone: "brand", text: "Sample data is ready. Open Discover to see it." });
    setBusy(false);
    router.refresh();
  }

  async function onlyPassword() {
    setBusy(true);
    const r = await setSamplePassword(password);
    setNote({ tone: r.ok ? "brand" : "danger", text: r.message });
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <Field
        label="Password for the sample accounts (optional)"
        htmlFor="sample-password"
        hint="Testers sign in with any sample email below and this password. Leave empty if testers will only browse. At least 8 characters."
      >
        <Input id="sample-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={load}>{busy ? "Working…" : loaded ? "Load again (adds anything missing)" : "Load sample data"}</Button>
        {loaded ? (
          <Button variant="secondary" disabled={busy || password.trim().length < 8} onClick={onlyPassword}>Set password only</Button>
        ) : null}
      </div>
      <ol className="space-y-2">
        {state.map((s) => (
          <li key={s.key} className="flex items-start gap-2 text-sm">
            {s.status === "done" ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-brand" aria-hidden /> : s.status === "failed" ? <XCircle className="mt-0.5 h-4 w-4 text-danger" aria-hidden /> : s.status === "running" ? <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-muted" aria-hidden /> : <Circle className="mt-0.5 h-4 w-4 text-muted" aria-hidden />}
            <span>
              <span className="font-medium">{s.label}</span>
              {s.message ? <span className="text-muted"> · {s.message}</span> : null}
            </span>
          </li>
        ))}
      </ol>
      {note ? <Notice tone={note.tone}>{note.text}</Notice> : null}
    </div>
  );
}

export function SampleRemover() {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "brand" | "danger"; text: string } | null>(null);
  return (
    <div className="space-y-3">
      <Field label='Type REMOVE to delete all sample accounts, needs, organisations, gifts and photos' htmlFor="sample-remove">
        <Input id="sample-remove" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="REMOVE" />
      </Field>
      <Button
        variant="secondary"
        disabled={busy || confirm.trim().toUpperCase() !== "REMOVE"}
        onClick={async () => {
          setBusy(true);
          const r = await removeSampleData(confirm);
          setNote({ tone: r.ok ? "brand" : "danger", text: r.message });
          setBusy(false);
          if (r.ok) router.refresh();
        }}
      >
        {busy ? "Removing…" : "Remove sample data"}
      </Button>
      {note ? <Notice tone={note.tone}>{note.text}</Notice> : null}
    </div>
  );
}
