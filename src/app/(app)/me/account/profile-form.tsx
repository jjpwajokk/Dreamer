"use client";

import { useActionState } from "react";
import { Button, Field, Input, Notice, Select } from "@/components/ui";
import { NIGERIAN_STATES } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { saveProfile } from "./actions";

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, action, pending] = useActionState(saveProfile, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Name shown on your impact card" htmlFor="display_name">
        <Input id="display_name" name="display_name" defaultValue={profile?.display_name ?? ""} required maxLength={40} />
      </Field>
      <Field label="Full name (private)" htmlFor="full_name">
        <Input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} maxLength={100} />
      </Field>
      <Field label="Phone (private)" htmlFor="phone">
        <Input id="phone" name="phone" type="tel" defaultValue={profile?.phone ?? ""} maxLength={20} />
      </Field>
      <Field label="State" htmlFor="state">
        <Select id="state" name="state" defaultValue={profile?.state ?? ""}>
          <option value="">Prefer not to say</option>
          {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
        </Select>
      </Field>
      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice>Saved.</Notice> : null}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
    </form>
  );
}
