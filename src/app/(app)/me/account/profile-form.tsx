"use client";

import { useActionState } from "react";
import { Button, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { NIGERIAN_STATES } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { SocialFields } from "@/components/social-fields";
import { cleanSocials } from "@/lib/socials";
import { saveProfile } from "./actions";

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, action, pending] = useActionState(saveProfile, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="First name (shown on your profile)" htmlFor="display_name">
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
      <Field label="A line about you (optional)" htmlFor="bio" hint="Shown on your profile. For example: “Teacher in Jos. I back students chasing big dreams.”">
        <Textarea id="bio" name="bio" rows={2} maxLength={280} defaultValue={profile?.bio ?? ""} />
      </Field>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="profile_public" defaultChecked={profile?.profile_public ?? true} className="mt-0.5 h-5 w-5 accent-[var(--color-brand)]" />
        <span>Let others see my profile <span className="text-muted">(first name, state, this line, and how many people you&apos;ve backed. Never amounts or contact details.)</span></span>
      </label>
      <SocialFields socials={cleanSocials(profile?.socials)} visibility={profile?.socials_visibility} />
      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice>Saved.</Notice> : null}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
    </form>
  );
}
